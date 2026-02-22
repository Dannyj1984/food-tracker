import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import foodRoutes from './routes/foods.js';
import customFoodRoutes from './routes/customFoods.js';
import customMealRoutes from './routes/customMeals.js';
import foodLogRoutes from './routes/foodLog.js';
import waterLogRoutes from './routes/waterLog.js';
import exerciseLogRoutes from './routes/exerciseLog.js';
import settingsRoutes from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';
import { cleanupOldEntries } from './services/cleanup.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// Security middleware (OWASP)
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(hpp());

// CORS — allow frontend + mobile testing origins
const allowedOrigins = [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
].filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Allow requests with no origin (e.g. curl, mobile apps, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Body parsing with size limits (OWASP A03: Injection)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', generalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// ---------------------------------------------------------------------------
// Inject Prisma into every request
// ---------------------------------------------------------------------------
app.use((req, _res, next) => {
    req.prisma = prisma;
    next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/custom-foods', customFoodRoutes);
app.use('/api/custom-meals', customMealRoutes);
app.use('/api/food-log', foodLogRoutes);
app.use('/api/water-log', waterLogRoutes);
app.use('/api/exercise-log', exerciseLogRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// 30-day cleanup cron (runs daily at 03:00)
// ---------------------------------------------------------------------------
cron.schedule('0 3 * * *', async () => {
    console.log('[CRON] Running daily cleanup…');
    try {
        await cleanupOldEntries(prisma);
    } catch (err) {
        console.error('[CRON] Cleanup failed:', err);
    }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend running on http://0.0.0.0:${PORT}`);
    console.log(`   CORS origins: ${allowedOrigins.join(', ')}`);
});
