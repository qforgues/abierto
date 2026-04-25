import { Router, Request, Response } from 'express';
import { Database } from 'sqlite3';

const router = Router();

/**
 * Initialize health check routes
 * @param db - SQLite database instance
 */
export function initHealthRoutes(db: Database): Router {
  /**
   * GET /health
   * Health check endpoint
   * Returns: { status: 'ok', timestamp: string, database: 'ok' | 'error' }
   */
  router.get('/', (req: Request, res: Response) => {
    const timestamp = new Date().toISOString();

    // Check database connection
    db.get('SELECT 1', (err: Error | null) => {
      if (err) {
        return res.status(503).json({
          status: 'error',
          timestamp,
          database: 'error',
          message: 'Database connection failed.',
        });
      }

      return res.status(200).json({
        status: 'ok',
        timestamp,
        database: 'ok',
      });
    });
  });

  return router;
}
