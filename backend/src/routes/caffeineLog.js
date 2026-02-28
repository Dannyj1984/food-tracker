import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function handleValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed.', details: errors.array().map(e => e.msg) });
    }
    return null;
}

// GET /api/caffeine-log?date=YYYY-MM-DD
router.get('/', [
    query('date').optional().isISO8601(),
], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const where = { userId: req.userId };
        if (req.query.date) {
            where.date = new Date(req.query.date);
        }

        const entries = await req.prisma.caffeineLog.findMany({
            where,
            orderBy: [{ date: 'desc' }, { time: 'asc' }],
        });

        const totalMg = entries.reduce((sum, e) => sum + e.amountMg, 0);

        res.json({ entries, totalMg });
    } catch (err) { next(err); }
});

// GET /api/caffeine-log/summary?days=30
router.get('/summary', [
    query('days').optional().isInt({ min: 1, max: 90 }),
], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const entries = await req.prisma.caffeineLog.findMany({
            where: {
                userId: req.userId,
                date: { gte: startDate },
            },
            orderBy: { date: 'asc' },
        });

        const summaryMap = {};
        for (const entry of entries) {
            const dateKey = entry.date.toISOString().split('T')[0];
            if (!summaryMap[dateKey]) {
                summaryMap[dateKey] = { date: dateKey, totalMg: 0, entryCount: 0 };
            }
            summaryMap[dateKey].totalMg += entry.amountMg;
            summaryMap[dateKey].entryCount++;
        }

        res.json(Object.values(summaryMap));
    } catch (err) { next(err); }
});

// POST /api/caffeine-log
router.post('/', [
    body('date').isISO8601().toDate(),
    body('time').matches(/^\d{2}:\d{2}$/),
    body('amountMg').isInt({ min: 1, max: 5000 }),
], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const [hours, minutes] = req.body.time.split(':').map(Number);
        const timeDate = new Date(1970, 0, 1, hours, minutes);

        const entry = await req.prisma.caffeineLog.create({
            data: {
                userId: req.userId,
                date: new Date(req.body.date),
                time: timeDate,
                amountMg: req.body.amountMg,
            },
        });

        res.status(201).json(entry);
    } catch (err) { next(err); }
});

// DELETE /api/caffeine-log/:id
router.delete('/:id', [param('id').isInt({ min: 1 })], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;
        const id = parseInt(req.params.id);

        const existing = await req.prisma.caffeineLog.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existing) return res.status(404).json({ error: 'Entry not found.' });

        await req.prisma.caffeineLog.delete({ where: { id } });
        res.json({ message: 'Entry deleted.' });
    } catch (err) { next(err); }
});

export default router;
