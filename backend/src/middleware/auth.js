import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware
 * OWASP A07: Identification and Authentication Failures
 * - Validates Bearer token from Authorization header
 * - Extracts user ID and attaches to request
 * - Rejects expired, malformed, or missing tokens
 */
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.length > 2000) {
        return res.status(401).json({ error: 'Invalid token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            maxAge: process.env.JWT_ACCESS_EXPIRY || '15m',
        });

        req.userId = decoded.userId;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired.', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Invalid token.' });
    }
}
