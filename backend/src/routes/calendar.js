import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', [
    query('start').isDate(),
    query('end').isDate(),
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const entries = await req.prisma.sharedMealCalendar.findMany({
            where: {
                date: {
                    gte: new Date(req.query.start),
                    lte: new Date(req.query.end),
                },
            },
            include: {
                customMeal: true,
                user: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'asc' },
        });

        res.json(entries);
    } catch (err) { next(err); }
});

// POST /api/calendar
// Create or update calendar entry for a date
router.post('/', [
    body('date').isDate(),
    body('customMealId').isInt(),
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const date = new Date(req.body.date);
        const customMealId = parseInt(req.body.customMealId);

        // Upsert logic: if an entry already exists for this date, update it
        const entry = await req.prisma.sharedMealCalendar.upsert({
            where: { date },
            update: {
                customMealId,
                userId: req.userId,
            },
            create: {
                date,
                customMealId,
                userId: req.userId,
            },
            include: {
                customMeal: true,
            }
        });

        res.json(entry);
    } catch (err) { next(err); }
});

// DELETE /api/calendar/:date
router.delete('/:date', async (req, res, next) => {
    try {
        const date = new Date(req.params.date);
        if (isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid date' });

        await req.prisma.sharedMealCalendar.delete({
            where: { date },
        });

        res.json({ message: 'Entry deleted' });
    } catch (err) { next(err); }
});

export default router;
