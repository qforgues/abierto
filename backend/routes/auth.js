const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const loginRateLimiter = require('../middleware/rateLimit');
const db = require('../db/database');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticates an owner using business code and password
 * Returns a JWT token in httpOnly cookie on success
 */
router.post('/login', loginRateLimiter, async (req, res) => {
    try {
        const { businessCode, password } = req.body;

        // Validate input
        if (!businessCode || !password) {
            return res.status(400).json({
                error: 'Business code and password are required.'
            });
        }

        // Trim and validate business code format
        const trimmedBusinessCode = businessCode.trim().toUpperCase();
        if (!/^[A-Z0-9]{6,8}$/.test(trimmedBusinessCode)) {
            return res.status(400).json({
                error: 'Invalid business code format.'
            });
        }

        // Retrieve owner by business code
        const owner = await db.getOwnerByBusinessCode(trimmedBusinessCode);
        if (!owner) {
            return res.status(401).json({
                error: 'Invalid business code or password.'
            });
        }

        // Compare provided password with stored hash
        const passwordMatch = await bcrypt.compare(password, owner.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid business code or password.'
            });
        }

        // Generate JWT token with 7-day expiry
        const token = jwt.sign(
            { id: owner.id, businessCode: owner.business_code },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        // Set token in httpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        });

        return res.status(200).json({
            message: 'Login successful.',
            owner: {
                id: owner.id,
                businessCode: owner.business_code
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            error: 'Internal server error.'
        });
    }
});

/**
 * POST /api/auth/logout
 * Clears the JWT token cookie
 */
router.post('/logout', (req, res) => {
    try {
        res.clearCookie('token');
        return res.status(200).json({
            message: 'Logout successful.'
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            error: 'Internal server error.'
        });
    }
});

module.exports = router;
