import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { Database } from 'sqlite3';

const router = Router();

/**
 * Initialize auth routes
 * @param db - SQLite database instance
 */
export function initAuthRoutes(db: Database): Router {
  /**
   * POST /auth/login
   * Owner login endpoint
   * Body: { business_code: string, password: string }
   * Returns: JWT token in httpOnly cookie
   */
  router.post('/login', loginRateLimiter, (req: Request, res: Response) => {
    const { business_code, password } = req.body;

    // Validate input
    if (!business_code || !password) {
      return res.status(400).json({ error: 'Business code and password are required.' });
    }

    // Query database for business
    db.get(
      `SELECT id, password_hash FROM businesses WHERE code = ?`,
      [business_code],
      async (err: Error | null, row: any) => {
        if (err) {
          return res.status(500).json({ error: 'Database error.' });
        }

        if (!row) {
          return res.status(401).json({ error: 'Invalid business code or password.' });
        }

        // Verify password
        try {
          const passwordMatch = await bcrypt.compare(password, row.password_hash);
          if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid business code or password.' });
          }

          // Generate JWT token
          const token = jwt.sign(
            { businessId: row.id, businessCode: business_code },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
          );

          // Set httpOnly cookie
          res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          });

          return res.status(200).json({ message: 'Login successful.' });
        } catch (error) {
          return res.status(500).json({ error: 'Authentication error.' });
        }
      }
    );
  });

  /**
   * POST /auth/logout
   * Owner logout endpoint
   */
  router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('authToken');
    return res.status(200).json({ message: 'Logout successful.' });
  });

  return router;
}
