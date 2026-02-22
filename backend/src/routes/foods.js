import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { lookupBarcode } from '../services/openFoodFacts.js';

const router = Router();

router.use(authenticate);

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
