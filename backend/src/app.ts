import express, { Express } from 'express';
import fileUpload from 'express-fileupload';
import cookieParser from 'cookie-parser';
import { Database } from 'sqlite3';
import { abuseLoggingMiddleware } from './middleware/abuseLogging';
import { payloadSizeLimitMiddleware } from './middleware/payloadSizeLimit';
import { initAuthRoutes } from './routes/auth';
import { initBusinessRoutes } from './routes/businesses';
import { initUploadRoutes } from './routes/uploads';
import { initHealthRoutes } from './routes/health';

/**
 * Initialize Express application
 * @param db - SQLite database instance
 * @returns Configured Express app
 */
export function createApp(db: Database): Express {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } }));
  app.use(cookieParser());
  app.use(payloadSizeLimitMiddleware);
  app.use(abuseLoggingMiddleware);

  // Routes
  app.use('/auth', initAuthRoutes(db));
  app.use('/businesses', initBusinessRoutes(db));
  app.use('/uploads', initUploadRoutes(db));
  app.use('/health', initHealthRoutes(db));

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
