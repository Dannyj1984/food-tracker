import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const SETTINGS_FIELDS = [
    'dailyCalorieTarget', 'dailyWaterTargetMl', 'dailyCaffeineTargetMg',
    'weeklyHrZone13Mins', 'weeklyHrZone45Mins',
];

function settingsResponse(settings) {
    const result = {};
    for (const f of SETTINGS_FIELDS) result[f] = settings[f];
    return result;
}

// GET /api/settings
router.get('/', async (req, res, next) => {
    try {
        let settings = await req.prisma.settings.findUnique({
            where: { userId: req.userId },
        });

        // Auto-create if missing
        if (!settings) {
            settings = await req.prisma.settings.create({
                data: { userId: req.userId },
            });
        }

        res.json(settingsResponse(settings));
    } catch (err) { next(err); }
});

// PUT /api/settings
router.put('/', [
    body('dailyCalorieTarget').optional().isInt({ min: 500, max: 10000 }),
    body('dailyWaterTargetMl').optional().isInt({ min: 500, max: 10000 }),
    body('dailyCaffeineTargetMg').optional().isInt({ min: 0, max: 2000 }),
    body('weeklyHrZone13Mins').optional().isInt({ min: 0, max: 1440 }),
    body('weeklyHrZone45Mins').optional().isInt({ min: 0, max: 1440 }),
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed.', details: errors.array().map(e => e.msg) });
        }

        const updateData = {};
        for (const f of SETTINGS_FIELDS) {
            if (req.body[f] !== undefined) updateData[f] = req.body[f];
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update.' });
        }

        const settings = await req.prisma.settings.upsert({
            where: { userId: req.userId },
            update: updateData,
            create: { userId: req.userId, ...updateData },
        });

        res.json(settingsResponse(settings));
    } catch (err) { next(err); }
});

export default router;
