import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const mealValidation = [
    body('name').trim().notEmpty().isLength({ max: 255 }),
    body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
    body('servingSizeG').isFloat({ min: 0.1, max: 5000 }),
    body('calories').isFloat({ min: 0, max: 9999 }),
    body('fat').isFloat({ min: 0, max: 999 }),
    body('saturatedFat').isFloat({ min: 0, max: 999 }),
    body('carbs').isFloat({ min: 0, max: 999 }),
    body('sugars').isFloat({ min: 0, max: 999 }),
    body('fiber').isFloat({ min: 0, max: 999 }),
    body('protein').isFloat({ min: 0, max: 999 }),
    body('salt').isFloat({ min: 0, max: 100 }),
    body('caffeine').optional({ nullable: true }).isFloat({ min: 0, max: 5000 }),
];

const idParam = [param('id').isInt({ min: 1 })];

function handleValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed.', details: errors.array().map(e => e.msg) });
    }
    return null;
}

// GET /api/custom-meals
router.get('/', async (req, res, next) => {
    try {
        const meals = await req.prisma.customMeal.findMany({
            orderBy: [{ isFavourite: 'desc' }, { createdAt: 'desc' }],
        });
        res.json(meals);
    } catch (err) { next(err); }
});

// GET /api/custom-meals/:id
router.get('/:id', idParam, async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;
        const id = parseInt(req.params.id);

        const meal = await req.prisma.customMeal.findFirst({
            where: { id },
        });
        if (!meal) return res.status(404).json({ error: 'Meal not found.' });

        res.json(meal);
    } catch (err) { next(err); }
});

// POST /api/custom-meals
router.post('/', mealValidation, async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const meal = await req.prisma.customMeal.create({
            data: {
                userId: req.userId,
                name: req.body.name,
                description: req.body.description || null,
                servingSizeG: req.body.servingSizeG,
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
        res.status(201).json(meal);
    } catch (err) { next(err); }
});

// PUT /api/custom-meals/:id
router.put('/:id', [...idParam, ...mealValidation], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;
        const id = parseInt(req.params.id);

        const existing = await req.prisma.customMeal.findFirst({
            where: { id },
        });
        if (!existing) return res.status(404).json({ error: 'Meal not found.' });

        const meal = await req.prisma.customMeal.update({
            where: { id },
            data: {
                name: req.body.name,
                description: req.body.description || null,
                servingSizeG: req.body.servingSizeG,
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
        res.json(meal);
    } catch (err) { next(err); }
});

// DELETE /api/custom-meals/:id
router.delete('/:id', idParam, async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;
        const id = parseInt(req.params.id);

        const existing = await req.prisma.customMeal.findFirst({
            where: { id },
        });
        if (!existing) return res.status(404).json({ error: 'Meal not found.' });

        await req.prisma.customMeal.delete({ where: { id } });
        res.json({ message: 'Meal deleted.' });
    } catch (err) { next(err); }
});
// PATCH /api/custom-meals/:id/favourite — toggle favourite
router.patch('/:id/favourite', idParam, async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;
        const id = parseInt(req.params.id);

        const existing = await req.prisma.customMeal.findFirst({
            where: { id },
        });
        if (!existing) return res.status(404).json({ error: 'Meal not found.' });

        const meal = await req.prisma.customMeal.update({
            where: { id },
            data: { isFavourite: !existing.isFavourite },
        });
        res.json(meal);
    } catch (err) { next(err); }
});

export default router;
