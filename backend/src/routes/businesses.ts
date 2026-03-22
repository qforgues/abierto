import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import { businessCreationRateLimiter } from '../middleware/rateLimiter';
import { GuestCodeService } from '../services/guestCodeService';
import { Database } from 'sqlite3';

const router = Router();

/**
 * Initialize business routes
 * @param db - SQLite database instance
 */
export function initBusinessRoutes(db: Database): Router {
  const guestCodeService = new GuestCodeService(db);

  /**
   * POST /businesses
   * Create a new business
   * Body: { name: string, password: string }
   * Returns: { business_code: string, guest_code: string }
   */
  router.post('/', businessCreationRateLimiter, async (req: Request, res: Response) => {
    const { name, password } = req.body;

    // Validate input
    if (!name || !password) {
      return res.status(400).json({ error: 'Business name and password are required.' });
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    try {
      // Hash password with bcrypt (12 rounds)
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate business code (6-8 alphanumeric characters)
      const businessCode = generateBusinessCode();

      // Insert business into database
      db.run(
        `INSERT INTO businesses (name, code, password_hash) VALUES (?, ?, ?)`,
        [name, businessCode, passwordHash],
        async function (err: Error | null) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create business.' });
          }

          const businessId = this.lastID;

          try {
            // Create guest code
            const guestCode = await guestCodeService.createGuestCode(businessId);

            return res.status(201).json({
              business_code: businessCode,
              guest_code: guestCode,
              message: 'Business created successfully.',
            });
          } catch (error) {
            return res.status(500).json({ error: 'Failed to create guest code.' });
          }
        }
      );
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create business.' });
    }
  });

  /**
   * GET /businesses/:id
   * Get business details
   */
  router.get('/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    db.get(
      `SELECT id, name, code FROM businesses WHERE id = ?`,
      [id],
      (err: Error | null, row: any) => {
        if (err) {
          return res.status(500).json({ error: 'Database error.' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Business not found.' });
        }

        return res.status(200).json(row);
      }
    );
  });

  return router;
}

/**
 * Generate a random business code (6-8 alphanumeric characters)
 * @returns A random business code
 */
function generateBusinessCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
