import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate request payload size
 * - Checks that the request body does not exceed 10 MB
 */
export function payloadSizeLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const maxPayloadSize = 10 * 1024 * 1024; // 10 MB
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);

  if (contentLength > maxPayloadSize) {
    return res.status(400).send('Payload too large. Maximum payload size is 10 MB.');
  }

  next();
}
