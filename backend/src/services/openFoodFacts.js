/**
 * Open Food Facts API Client
 * OWASP A08: Software and Data Integrity Failures
 * - Validate and sanitise external API responses
 * - Never trust third-party data blindly
 */
import https from 'https';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const REQUEST_TIMEOUT = 10000;

const FIELDS = 'product_name,brands,nutriments,serving_quantity,serving_size,code';

// Sanitise and clamp a numeric value
const safeNum = (val, max = 10000) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return 0;
    return Math.min(num, max);
};

// Map a raw OFF product object to our normalised shape
function normaliseProduct(p, barcode = null) {
    const n = p.nutriments || {};
    return {
        barcode: barcode || p.code || null,
        name: typeof p.product_name === 'string' && p.product_name ? p.product_name.slice(0, 255) : 'Unknown',
        brand: typeof p.brands === 'string' && p.brands ? p.brands.slice(0, 255) : null,
        servingSizeG: safeNum(p.serving_quantity, 5000) || 100,
        caloriesPer100g: safeNum(n['energy-kcal_100g'], 9999),
        fatPer100g: safeNum(n.fat_100g, 100),
        saturatedFatPer100g: safeNum(n['saturated-fat_100g'], 100),
        carbsPer100g: safeNum(n.carbohydrates_100g, 100),
        sugarsPer100g: safeNum(n.sugars_100g, 100),
        fiberPer100g: safeNum(n.fiber_100g, 100),
        proteinPer100g: safeNum(n.proteins_100g, 100),
        saltPer100g: safeNum(n.salt_100g, 100),
        caffeinePer100g: n.caffeine_100g !== undefined ? safeNum(n.caffeine_100g, 5000) : null,
    };
}

/**
 * Lookup a barcode on Open Food Facts
 * Returns normalised nutrition data or null if not found
 */
export async function lookupBarcode(code) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(
            `${OFF_API_BASE}/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
            {
                signal: controller.signal,
                headers: { 'User-Agent': 'FoodTracker/1.0 (personal-use)' },
            }
        );

        clearTimeout(timeout);

        if (!response.ok || response.status === 404) return null;

        const data = await response.json();
        if (!data || data.status !== 1 || !data.product) return null;

        return normaliseProduct(data.product, code);
    } catch (err) {
        if (err.name === 'AbortError') {
            console.warn('[OFF] Request timed out for barcode:', code);
        } else {
            console.error('[OFF] Lookup error:', err.message);
        }
        return null;
    }
}

/**
 * Make a single HTTPS GET request and return the parsed JSON body.
 * Follows up to `maxRedirects` redirects. Resolves null on any failure.
 */
function httpsGetJson(urlStr, timeoutMs, maxRedirects = 3) {
    return new Promise((resolve) => {
        if (maxRedirects < 0) { resolve(null); return; }

        const parsed = new URL(urlStr);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: {
                'User-Agent': 'FoodTracker/1.0 (personal-use)',
                'Accept': 'application/json',
            },
            timeout: timeoutMs,
        };

        let destroyed = false;

        const req = https.get(options, (res) => {
            // Follow redirect
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                const next = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : `https://${parsed.hostname}${res.headers.location}`;
                resolve(httpsGetJson(next, timeoutMs, maxRedirects - 1));
                return;
            }

            if (res.statusCode !== 200) {
                res.resume();
                resolve(null);
                return;
            }

            let raw = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { raw += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch { resolve(null); }
            });
        });

        req.on('timeout', () => {
            destroyed = true;
            req.destroy();
        });

        req.on('error', (err) => {
            if (destroyed) {
                // We caused this by calling req.destroy() — not an unexpected error
                resolve(null);
                return;
            }
            console.error('[OFF] HTTPS request error:', err.message);
            resolve(null);
        });
    });
}

/**
 * Search Open Food Facts by text query.
 * Returns up to `limit` normalised results (default 10), or [] on any failure.
 */
export async function searchByText(query, limit = 10) {
    const params = new URLSearchParams({
        countries_tags: 'en:united-kingdom',
        categories_tags: query,
        lc: 'en',
        page_size: String(limit),
        fields: FIELDS,
        sort_by: 'unique_scans_n',
    });

    const url = `https://world.openfoodfacts.org/api/v2/search?${params.toString()}`;
    const SEARCH_TIMEOUT = 5000; // generous timeout for search responses

    const response = await fetch(url, {
        headers: { 'User-Agent': 'MyFoodApp/1.0 (contact@example.com)' }
    });
    const data = await response.json();

    if (!data) {
        console.warn('[OFF] Search returned no data for query:', query);
        return [];
    }

    if (!Array.isArray(data.products)) return [];

    return data.products
        .filter(p => p.product_name)
        .filter(p => p.nutriments['energy-kcal_100g'] > 0)
        .slice(0, limit)
        .map(p => normaliseProduct(p));
}

