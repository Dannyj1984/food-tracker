import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const VALID_SOURCES = ['openfoodfacts', 'custom_food', 'custom_meal'];

const logValidation = [
    body('date').isISO8601().toDate(),
    body('time').matches(/^\d{2}:\d{2}$/),
    body('mealType').isIn(VALID_MEAL_TYPES),
    body('source').isIn(VALID_SOURCES),
    body('sourceId').trim().notEmpty().isLength({ max: 255 }),
    body('name').trim().notEmpty().isLength({ max: 255 }),
    body('quantityG').isFloat({ min: 0.1, max: 10000 }),
    body('calories').isFloat({ min: 0, max: 99999 }),
    body('fat').isFloat({ min: 0, max: 9999 }),
    body('saturatedFat').isFloat({ min: 0, max: 9999 }),
    body('carbs').isFloat({ min: 0, max: 9999 }),
    body('sugars').isFloat({ min: 0, max: 9999 }),
    body('fiber').isFloat({ min: 0, max: 9999 }),
    body('protein').isFloat({ min: 0, max: 9999 }),
    body('salt').isFloat({ min: 0, max: 9999 }),
    body('caffeine').optional({ nullable: true }).isFloat({ min: 0, max: 5000 }),
];

function handleValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed.', details: errors.array().map(e => e.msg) });
    }
    return null;
}

// GET /api/food-log?date=YYYY-MM-DD&meal_type=breakfast
router.get('/', [
    query('date').optional().isISO8601(),
    query('meal_type').optional().isIn(VALID_MEAL_TYPES),
], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const where = { userId: req.userId };

        if (req.query.date) {
            where.date = new Date(req.query.date);
        }

        if (req.query.meal_type) {
            where.mealType = req.query.meal_type;
        }

        const entries = await req.prisma.foodLog.findMany({
            where,
            orderBy: [{ date: 'desc' }, { time: 'asc' }],
        });

        res.json(entries);
    } catch (err) { next(err); }
});

// GET /api/food-log/recent?days=7
// Returns deduplicated recent food items (most-recent occurrence of each unique food).
// Derives per-100g values from stored totals so items can be re-logged at any quantity.
router.get('/recent', [
    query('days').optional().isInt({ min: 1, max: 30 }),
], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const days = parseInt(req.query.days) || 7;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const entries = await req.prisma.foodLog.findMany({
            where: { userId: req.userId, date: { gte: since } },
            orderBy: [{ date: 'desc' }, { time: 'desc' }],
        });

        // Deduplicate: keep the most recent entry per unique food (by source + sourceId)
        const seen = new Set();
        const unique = [];
        for (const e of entries) {
            const key = `${e.source}::${e.sourceId}`;
            if (!seen.has(key)) {
                seen.add(key);
                const qty = Number(e.quantityG) || 100;
                unique.push({
                    name: e.name,
                    source: e.source,
                    sourceId: e.sourceId,
                    lastDate: e.date,
                    servingSizeG: qty,
                    caloriesPer100g: Math.round((Number(e.calories) / qty) * 100 * 10) / 10,
                    fatPer100g: Math.round((Number(e.fat) / qty) * 100 * 100) / 100,
                    saturatedFatPer100g: Math.round((Number(e.saturatedFat) / qty) * 100 * 100) / 100,
                    carbsPer100g: Math.round((Number(e.carbs) / qty) * 100 * 100) / 100,
                    sugarsPer100g: Math.round((Number(e.sugars) / qty) * 100 * 100) / 100,
                    fiberPer100g: Math.round((Number(e.fiber) / qty) * 100 * 100) / 100,
                    proteinPer100g: Math.round((Number(e.protein) / qty) * 100 * 100) / 100,
                    saltPer100g: Math.round((Number(e.salt) / qty) * 100 * 100) / 100,
                    caffeinePer100g: e.caffeine ? Math.round((Number(e.caffeine) / qty) * 100 * 100) / 100 : null,
                });
            }
        }

        res.json(unique);
    } catch (err) { next(err); }
});

// GET /api/food-log/summary?days=30
router.get('/summary', [
    query('days').optional().isInt({ min: 1, max: 90 }),
], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const entries = await req.prisma.foodLog.findMany({
            where: {
                userId: req.userId,
                date: { gte: startDate },
            },
            orderBy: { date: 'asc' },
        });

        // Group by date and sum nutrients
        const summaryMap = {};
        for (const entry of entries) {
            const dateKey = entry.date.toISOString().split('T')[0];
            if (!summaryMap[dateKey]) {
                summaryMap[dateKey] = {
                    date: dateKey,
                    calories: 0, fat: 0, saturatedFat: 0, carbs: 0,
                    sugars: 0, fiber: 0, protein: 0, salt: 0, caffeine: 0,
                    entryCount: 0,
                };
            }
            const s = summaryMap[dateKey];
            s.calories += Number(entry.calories);
            s.fat += Number(entry.fat);
            s.saturatedFat += Number(entry.saturatedFat);
            s.carbs += Number(entry.carbs);
            s.sugars += Number(entry.sugars);
            s.fiber += Number(entry.fiber);
            s.protein += Number(entry.protein);
            s.salt += Number(entry.salt);
            s.caffeine += Number(entry.caffeine || 0);
            s.entryCount++;
        }

        // Round values
        const summary = Object.values(summaryMap).map(s => ({
            ...s,
            calories: Math.round(s.calories * 10) / 10,
            fat: Math.round(s.fat * 10) / 10,
            saturatedFat: Math.round(s.saturatedFat * 10) / 10,
            carbs: Math.round(s.carbs * 10) / 10,
            sugars: Math.round(s.sugars * 10) / 10,
            fiber: Math.round(s.fiber * 10) / 10,
            protein: Math.round(s.protein * 10) / 10,
            salt: Math.round(s.salt * 100) / 100,
            caffeine: Math.round(s.caffeine * 10) / 10,
        }));

        res.json(summary);
    } catch (err) { next(err); }
});

// POST /api/food-log
router.post('/', logValidation, async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        // Parse time string to a Date for the Time field
        const [hours, minutes] = req.body.time.split(':').map(Number);
        const timeDate = new Date(1970, 0, 1, hours, minutes);

        const entry = await req.prisma.foodLog.create({
            data: {
                userId: req.userId,
                date: new Date(req.body.date),
                time: timeDate,
                mealType: req.body.mealType,
                source: req.body.source,
                sourceId: req.body.sourceId,
                name: req.body.name,
                quantityG: req.body.quantityG,
                calories: req.body.calories,
                fat: req.body.fat,
                saturatedFat: req.body.saturatedFat,
                carbs: req.body.carbs,
                sugars: req.body.sugars,
                fiber: req.body.fiber,
                protein: req.body.protein,
                salt: req.body.salt,
                caffeine: req.body.caffeine ?? null,
            },
        });

        res.status(201).json(entry);
    } catch (err) { next(err); }
});

// PATCH /api/food-log/:id/meal-type
router.patch('/:id/meal-type', [
    param('id').isInt({ min: 1 }),
    body('mealType').isIn(VALID_MEAL_TYPES),
], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;
        const id = parseInt(req.params.id);

        const existing = await req.prisma.foodLog.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existing) return res.status(404).json({ error: 'Log entry not found.' });

        const updated = await req.prisma.foodLog.update({
            where: { id },
            data: { mealType: req.body.mealType },
        });

        res.json(updated);
    } catch (err) { next(err); }
});

// DELETE /api/food-log/:id
router.delete('/:id', [param('id').isInt({ min: 1 })], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;
        const id = parseInt(req.params.id);

        const existing = await req.prisma.foodLog.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existing) return res.status(404).json({ error: 'Log entry not found.' });

        await req.prisma.foodLog.delete({ where: { id } });
        res.json({ message: 'Entry deleted.' });
    } catch (err) { next(err); }
});

export default router;
