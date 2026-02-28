import { Router } from 'express';
import { query as queryValidator, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { lookupBarcode, searchByText } from '../services/openFoodFacts.js';

const router = Router();

router.use(authenticate);

/**
 * GET /api/foods/search?q=banana
 * Search Open Food Facts by name + user's custom foods. Returns up to 10 results.
 */
router.get('/search', [
    queryValidator('q').trim().notEmpty().isLength({ max: 100 }),
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Invalid search query.' });
        }

        const q = req.query.q.trim();

        // Run OFF search and custom food search in parallel
        const [offResults, customFoods] = await Promise.all([
            searchByText(q, 10),
            req.prisma.customFood.findMany({
                where: {
                    userId: req.userId,
                    name: { contains: q, mode: 'insensitive' },
                },
                take: 5,
            }),
        ]);

        const customResults = customFoods.map(f => ({
            source: 'custom_food',
            food: {
                barcode: f.barcode || null,
                id: f.id,
                name: f.name,
                brand: f.brand || null,
                servingSizeG: Number(f.servingSizeG),
                caloriesPer100g: Number(f.caloriesPer100g),
                fatPer100g: Number(f.fatPer100g),
                saturatedFatPer100g: Number(f.saturatedFatPer100g),
                carbsPer100g: Number(f.carbsPer100g),
                sugarsPer100g: Number(f.sugarsPer100g),
                fiberPer100g: Number(f.fiberPer100g),
                proteinPer100g: Number(f.proteinPer100g),
                saltPer100g: Number(f.saltPer100g),
                caffeinePer100g: f.caffeinePer100g ? Number(f.caffeinePer100g) : null,
            },
        }));

        console.log(offResults);

        const offMapped = offResults?.map(food => ({ source: 'openfoodfacts', food })) || [];

        // Custom foods first, then OFF results; cap at 10 total
        const combined = [...customResults, ...offMapped].slice(0, 10);

        res.json(combined);
    } catch (err) {
        console.error("Error in searchByText:", err);
        next(err);
    }
});



/**
 * GET /api/foods/barcode/:code
 * Lookup flow: Open Food Facts → custom_foods → 404
 * OWASP A03: Injection — validate barcode format
 */
router.get('/barcode/:code', async (req, res, next) => {
    try {
        const { code } = req.params;

        // Validate barcode format (digits only, 4-20 chars)
        if (!/^\d{4,20}$/.test(code)) {
            return res.status(400).json({ error: 'Invalid barcode format.' });
        }

        // 1. Try Open Food Facts
        const offResult = await lookupBarcode(code);
        if (offResult) {
            return res.json({ source: 'openfoodfacts', food: offResult });
        }

        // 2. Try custom_foods (user-scoped)
        const customFood = await req.prisma.customFood.findFirst({
            where: { barcode: code, userId: req.userId },
        });

        if (customFood) {
            return res.json({
                source: 'custom_food',
                food: {
                    barcode: customFood.barcode,
                    name: customFood.name,
                    brand: customFood.brand,
                    servingSizeG: Number(customFood.servingSizeG),
                    caloriesPer100g: Number(customFood.caloriesPer100g),
                    fatPer100g: Number(customFood.fatPer100g),
                    saturatedFatPer100g: Number(customFood.saturatedFatPer100g),
                    carbsPer100g: Number(customFood.carbsPer100g),
                    sugarsPer100g: Number(customFood.sugarsPer100g),
                    fiberPer100g: Number(customFood.fiberPer100g),
                    proteinPer100g: Number(customFood.proteinPer100g),
                    saltPer100g: Number(customFood.saltPer100g),
                    caffeinePer100g: customFood.caffeinePer100g ? Number(customFood.caffeinePer100g) : null,
                },
            });
        }

        // 3. Not found
        res.status(404).json({ error: 'Food not found. You can add it manually.' });
    } catch (err) {
        next(err);
    }
});

export default router;
