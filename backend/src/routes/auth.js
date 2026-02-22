import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 12;

/**
 * Validation helpers
 * OWASP A03: Injection — validate and sanitise all inputs
 */
const registerValidation = [
    body('email')
        .isEmail().withMessage('Valid email required.')
        .normalizeEmail()
        .isLength({ max: 255 }),
    body('password')
        .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number.'),
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Name is required (max 100 chars).')
    ,
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().isLength({ max: 255 }),
    body('password').isLength({ min: 1, max: 128 }),
];

function handleValidationErrors(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed.', details: errors.array().map(e => e.msg) });
    }
    return null;
}

/**
 * Generate tokens
 * OWASP A02: Cryptographic Failures — use strong secrets, short expiry
 */
function generateAccessToken(userId) {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );
}

function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

// ============================================================
// POST /api/auth/register
// ============================================================
router.post('/register', registerValidation, async (req, res, next) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { email, password, name } = req.body;

        // Check existing user — use constant-time comparison approach
        // (Prisma findUnique on unique field is safe; we give generic error)
        const existingUser = await req.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            // OWASP: Don't reveal whether email exists — generic message
            // But still hash to make timing consistent
            await bcrypt.hash(password, SALT_ROUNDS);
            return res.status(409).json({ error: 'Registration failed. Please try a different email.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await req.prisma.user.create({
            data: { email, passwordHash, name },
            select: { id: true, email: true, name: true },
        });

        // Create default settings
        await req.prisma.settings.create({
            data: { userId: user.id },
        });

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken();

        // Store refresh token (hashed)
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await req.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshTokenHash,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        res.status(201).json({
            user: { id: user.id, email: user.email, name: user.name },
            accessToken,
            refreshToken,
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', loginValidation, async (req, res, next) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return;

        const { email, password } = req.body;

        const user = await req.prisma.user.findUnique({ where: { email } });

        if (!user) {
            // OWASP A07: Still hash to prevent timing attacks
            await bcrypt.hash(password, SALT_ROUNDS);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken();

        // Store refresh token (hashed)
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await req.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshTokenHash,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        // Clean up expired refresh tokens for this user
        await req.prisma.refreshToken.deleteMany({
            where: { userId: user.id, expiresAt: { lt: new Date() } },
        });

        res.json({
            user: { id: user.id, email: user.email, name: user.name },
            accessToken,
            refreshToken,
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// POST /api/auth/refresh
// ============================================================
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.length > 256) {
            return res.status(400).json({ error: 'Refresh token required.' });
        }

        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const storedToken = await req.prisma.refreshToken.findUnique({
            where: { token: tokenHash },
            include: { user: { select: { id: true, email: true, name: true } } },
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            if (storedToken) {
                // Clean up expired token
                await req.prisma.refreshToken.delete({ where: { id: storedToken.id } });
            }
            return res.status(401).json({ error: 'Invalid or expired refresh token.' });
        }

        // Rotate refresh token (OWASP best practice)
        const newAccessToken = generateAccessToken(storedToken.user.id);
        const newRefreshToken = generateRefreshToken();
        const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

        // Delete old, create new (atomic rotation)
        await req.prisma.$transaction([
            req.prisma.refreshToken.delete({ where: { id: storedToken.id } }),
            req.prisma.refreshToken.create({
                data: {
                    userId: storedToken.user.id,
                    token: newTokenHash,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            }),
        ]);

        res.json({
            user: storedToken.user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            await req.prisma.refreshToken.deleteMany({
                where: { token: tokenHash, userId: req.userId },
            });
        }

        // Also clean up all expired tokens for this user
        await req.prisma.refreshToken.deleteMany({
            where: { userId: req.userId, expiresAt: { lt: new Date() } },
        });

        res.json({ message: 'Logged out successfully.' });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// GET /api/auth/me — get current user
// ============================================================
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const user = await req.prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

export default router;
