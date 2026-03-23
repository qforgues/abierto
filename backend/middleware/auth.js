const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token from httpOnly cookie
 * Attaches decoded token data to req.user
 */
const verifyToken = (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                error: 'No token provided. Please log in.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token has expired. Please log in again.'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token. Please log in again.'
            });
        }
        return res.status(500).json({
            error: 'Internal server error.'
        });
    }
};

module.exports = verifyToken;
