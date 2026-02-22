import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const VALID_EXERCISE_TYPES = ['football', 'running', 'walking', 'netball', 'gym', 'swimming', 'other'];

const logValidation = [
    body('date').isISO8601().toDate(),
    body('exerciseType').isIn(VALID_EXERCISE_TYPES),
    body('caloriesBurnt').isInt({ min: 1, max: 99999 }),
    body('hrZone1Seconds').optional({ nullable: true }).isInt({ min: 0, max: 86400 }),
    body('hrZone2Seconds').optional({ nullable: true }).isInt({ min: 0, max: 86400 }),
    body('hrZone3Seconds').optional({ nullable: true }).isInt({ min: 0, max: 86400 }),
    body('hrZone4Seconds').optional({ nullable: true }).isInt({ min: 0, max: 86400 }),
    body('hrZone5Seconds').optional({ nullable: true }).isInt({ min: 0, max: 86400 }),
    body('notes').optional({ nullable: true }).trim().isLength({ max: 500 }),
];

function handleValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed.', details: errors.array().map(e => e.msg) });
    }
    return null;
}

// GET /api/exercise-log?date=YYYY-MM-DD
router.get('/', [
    query('date').optional().isISO8601(),
], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const where = { userId: req.userId };
        if (req.query.date) {
            where.date = new Date(req.query.date);
        }

        const entries = await req.prisma.exerciseLog.findMany({
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'asc' }],
        });

        const totalCaloriesBurnt = entries.reduce((sum, e) => sum + e.caloriesBurnt, 0);

        res.json({ entries, totalCaloriesBurnt });
    } catch (err) { next(err); }
});

// GET /api/exercise-log/summary?days=7
router.get('/summary', [
    query('days').optional().isInt({ min: 1, max: 90 }),
], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const days = parseInt(req.query.days) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const entries = await req.prisma.exerciseLog.findMany({
            where: {
                userId: req.userId,
                date: { gte: startDate },
            },
            orderBy: { date: 'asc' },
        });

        // Group by date
        const summaryMap = {};
        for (const entry of entries) {
            const dateKey = entry.date.toISOString().split('T')[0];
            if (!summaryMap[dateKey]) {
                summaryMap[dateKey] = {
                    date: dateKey,
                    caloriesBurnt: 0,
                    exerciseCount: 0,
                    hrZone1Seconds: 0,
                    hrZone2Seconds: 0,
                    hrZone3Seconds: 0,
                    hrZone4Seconds: 0,
                    hrZone5Seconds: 0,
                    exercises: [],
                };
            }
            const s = summaryMap[dateKey];
            s.caloriesBurnt += entry.caloriesBurnt;
            s.exerciseCount++;
            s.hrZone1Seconds += entry.hrZone1Seconds || 0;
            s.hrZone2Seconds += entry.hrZone2Seconds || 0;
            s.hrZone3Seconds += entry.hrZone3Seconds || 0;
            s.hrZone4Seconds += entry.hrZone4Seconds || 0;
            s.hrZone5Seconds += entry.hrZone5Seconds || 0;
            s.exercises.push({
                type: entry.exerciseType,
                caloriesBurnt: entry.caloriesBurnt,
            });
        }

        res.json(Object.values(summaryMap));
    } catch (err) { next(err); }
});

// POST /api/exercise-log
router.post('/', logValidation, async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;

        const entry = await req.prisma.exerciseLog.create({
            data: {
                userId: req.userId,
                date: new Date(req.body.date),
                exerciseType: req.body.exerciseType,
                caloriesBurnt: req.body.caloriesBurnt,
                hrZone1Seconds: req.body.hrZone1Seconds ?? null,
                hrZone2Seconds: req.body.hrZone2Seconds ?? null,
                hrZone3Seconds: req.body.hrZone3Seconds ?? null,
                hrZone4Seconds: req.body.hrZone4Seconds ?? null,
                hrZone5Seconds: req.body.hrZone5Seconds ?? null,
                notes: req.body.notes ?? null,
            },
        });

        res.status(201).json(entry);
    } catch (err) { next(err); }
});

// DELETE /api/exercise-log/:id
router.delete('/:id', [param('id').isInt({ min: 1 })], async (req, res, next) => {
    try {
        if (handleValidation(req, res)) return;
        const id = parseInt(req.params.id);

        const existing = await req.prisma.exerciseLog.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existing) return res.status(404).json({ error: 'Exercise entry not found.' });

        await req.prisma.exerciseLog.delete({ where: { id } });
        res.json({ message: 'Entry deleted.' });
    } catch (err) { next(err); }
});

export default router;
