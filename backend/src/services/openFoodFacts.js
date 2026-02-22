/**
 * Open Food Facts API Client
 * OWASP A08: Software and Data Integrity Failures
 * - Validate and sanitise external API responses
 * - Never trust third-party data blindly
 */

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const REQUEST_TIMEOUT = 5000;

/**
 * Lookup a barcode on Open Food Facts
 * Returns normalised nutrition data or null if not found
 */
export async function lookupBarcode(code) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(
            `${OFF_API_BASE}/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_quantity,serving_size`,
            {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'FoodTracker/1.0 (personal-use)',
                },
            }
        );

        clearTimeout(timeout);

        if (!response.ok || response.status === 404) {
            return null;
        }

        const data = await response.json();

        if (!data || data.status !== 1 || !data.product) {
            return null;
        }

        const p = data.product;
        const n = p.nutriments || {};

        // Sanitise and validate numeric values — clamp to reasonable ranges
        const safeNum = (val, max = 10000) => {
            const num = parseFloat(val);
            if (isNaN(num) || num < 0) return 0;
            return Math.min(num, max);
        };

        return {
            barcode: code,
            name: typeof p.product_name === 'string' ? p.product_name.slice(0, 255) : 'Unknown',
            brand: typeof p.brands === 'string' ? p.brands.slice(0, 255) : null,
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
    } catch (err) {
        if (err.name === 'AbortError') {
            console.warn('[OFF] Request timed out for barcode:', code);
        } else {
            console.error('[OFF] Lookup error:', err.message);
        }
        return null;
    }
}
