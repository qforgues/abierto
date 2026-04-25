import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate file uploads
 * - Checks file type (JPEG, PNG only)
 * - Checks file size (max 10 MB)
 */
export function fileValidationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if files are present in the request
  if (!req.files || Object.keys(req.files).length === 0) {
    return next();
  }

  const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
  const maxFileSize = 10 * 1024 * 1024; // 10 MB
  const allowedMimeTypes = ['image/jpeg', 'image/png'];

  for (const file of files) {
    // Validate file type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      (req as any).fileName = file.name;
      return res.status(400).send(`Invalid file type: ${file.mimetype}. Only JPEG and PNG are allowed.`);
    }

    // Validate file size
    if (file.size > maxFileSize) {
      return res.status(413).send(`File size exceeds 10 MB limit: ${file.name}`);
    }
  }

  next();
}
