/**
 * Global Error Handler
 * OWASP A09: Security Logging and Monitoring Failures
 * - Logs errors server-side
 * - Returns generic messages to client (no stack traces in production)
 */
export function errorHandler(err, _req, res, _next) {
    console.error('[ERROR]', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString(),
    });

    // Prisma known errors
    if (err.code === 'P2002') {
        return res.status(409).json({ error: 'A record with that value already exists.' });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Record not found.' });
    }

    // Validation errors from express-validator
    if (err.type === 'validation') {
        return res.status(400).json({ error: 'Validation failed.', details: err.details });
    }

    // Default — never leak internal details
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500
        ? 'An unexpected error occurred.'
        : err.message;

    res.status(statusCode).json({ error: message });
}
