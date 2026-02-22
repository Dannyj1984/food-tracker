import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// OWASP A03: Input validation for all fields
const foodValidation = [
    body('barcode').optional({ nullable: true }).trim().isLength({ max: 50 }).matches(/^[\d]*$/),
    body('name').trim().notEmpty().isLength({ max: 255 }),
    body('brand').optional({ nullable: true }).trim().isLength({ max: 255 }),
    body('servingSizeG').isFloat({ min: 0.1, max: 5000 }),
    body('caloriesPer100g').isFloat({ min: 0, max: 9999 }),
    body('fatPer100g').isFloat({ min: 0, max: 100 }),
    body('saturatedFatPer100g').isFloat({ min: 0, max: 100 }),
    body('carbsPer100g').isFloat({ min: 0, max: 100 }),
    body('sugarsPer100g').isFloat({ min: 0, max: 100 }),
    body('fiberPer100g').isFloat({ min: 0, max: 100 }),
    body('proteinPer100g').isFloat({ min: 0, max: 100 }),
    body('saltPer100g').isFloat({ min: 0, max: 100 }),
    body('caffeinePer100g').optional({ nullable: true }).isFloat({ min: 0, max: 5000 }),
];

const idParam = [param('id').isInt({ min: 1 })];

function handleValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed.', details: errors.array().map(e => e.msg) });
    }
    return null;
}

// GET /api/custom-foods
router.get('/', async (req, res, next) => {
    try {
        const foods = await req.prisma.customFood.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(foods);
    } catch (err) { next(err); }
});

// POST /api/custom-foods
router.post('/', foodValidation, async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const data = {
            userId: req.userId, // OWASP A01: Broken Access Control — always scope to user
            barcode: req.body.barcode || null,
            name: req.body.name,
            brand: req.body.brand || null,
            servingSizeG: req.body.servingSizeG,
            caloriesPer100g: req.body.caloriesPer100g,
            fatPer100g: req.body.fatPer100g,
            saturatedFatPer100g: req.body.saturatedFatPer100g,
            carbsPer100g: req.body.carbsPer100g,
            sugarsPer100g: req.body.sugarsPer100g,
            fiberPer100g: req.body.fiberPer100g,
            proteinPer100g: req.body.proteinPer100g,
            saltPer100g: req.body.saltPer100g,
            caffeinePer100g: req.body.caffeinePer100g ?? null,
        };

        const food = await req.prisma.customFood.create({ data });
        res.status(201).json(food);
    } catch (err) { next(err); }
});

// PUT /api/custom-foods/:id
router.put('/:id', [...idParam, ...foodValidation], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const id = parseInt(req.params.id);

        // OWASP A01: Verify ownership before update
        const existing = await req.prisma.customFood.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existing) return res.status(404).json({ error: 'Food not found.' });

        const food = await req.prisma.customFood.update({
            where: { id },
            data: {
                barcode: req.body.barcode || null,
                name: req.body.name,
                brand: req.body.brand || null,
                servingSizeG: req.body.servingSizeG,
                caloriesPer100g: req.body.caloriesPer100g,
                fatPer100g: req.body.fatPer100g,
                saturatedFatPer100g: req.body.saturatedFatPer100g,
                carbsPer100g: req.body.carbsPer100g,
                sugarsPer100g: req.body.sugarsPer100g,
                fiberPer100g: req.body.fiberPer100g,
                proteinPer100g: req.body.proteinPer100g,
                saltPer100g: req.body.saltPer100g,
                caffeinePer100g: req.body.caffeinePer100g ?? null,
            },
        });
        res.json(food);
    } catch (err) { next(err); }
});

// DELETE /api/custom-foods/:id
router.delete('/:id', idParam, async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const id = parseInt(req.params.id);

        // OWASP A01: Verify ownership before delete
        const existing = await req.prisma.customFood.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existing) return res.status(404).json({ error: 'Food not found.' });

        await req.prisma.customFood.delete({ where: { id } });
        res.json({ message: 'Food deleted.' });
    } catch (err) { next(err); }
});

export default router;
