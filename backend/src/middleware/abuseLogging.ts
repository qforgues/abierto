import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const abuseLogPath = path.join(logsDir, 'abuse.log');

/**
 * Log abuse events to the abuse.log file
 * @param message - The message to log
 */
function logAbuseEvent(message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  try {
    fs.appendFileSync(abuseLogPath, logEntry, 'utf-8');
  } catch (error) {
    console.error('Failed to write to abuse log:', error);
  }
}

/**
 * Middleware to log abuse events including rate limit violations,
 * invalid file types, and request size violations
 */
export function abuseLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Capture the original send function
  const originalSend = res.send;

  // Override the send function to intercept responses
  res.send = function (data: any): Response {
    // Log rate limit violations (429 status code)
    if (res.statusCode === 429) {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const endpoint = req.path;
      logAbuseEvent(`Rate limit violation - IP: ${clientIp}, Endpoint: ${endpoint}`);
    }

    // Log invalid file type rejections (400 status code with specific message)
    if (res.statusCode === 400 && typeof data === 'string' && data.includes('Invalid file type')) {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const endpoint = req.path;
      const fileName = (req as any).fileName || 'unknown';
      logAbuseEvent(`Invalid file type - IP: ${clientIp}, Endpoint: ${endpoint}, File: ${fileName}`);
    }

    // Log request size violations (413 status code)
    if (res.statusCode === 413) {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const endpoint = req.path;
      logAbuseEvent(`Request size violation - IP: ${clientIp}, Endpoint: ${endpoint}`);
    }

    // Log payload size violations (400 status code with specific message)
    if (res.statusCode === 400 && typeof data === 'string' && data.includes('Payload too large')) {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const endpoint = req.path;
      logAbuseEvent(`Payload size violation - IP: ${clientIp}, Endpoint: ${endpoint}`);
    }

    // Call the original send function
    return originalSend.call(this, data);
  };

  next();
}
