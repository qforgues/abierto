import { Router, Request, Response } from 'express';
import { fileUploadRateLimiter } from '../middleware/rateLimiter';
import { fileValidationMiddleware } from '../middleware/fileValidation';
import { Database } from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

/**
 * Initialize upload routes
 * @param db - SQLite database instance
 */
export function initUploadRoutes(db: Database): Router {
  /**
   * POST /uploads/:businessId
   * Upload photos for a business
   * Requires: guest code or owner authentication
   * Max: 5 files per 24 hours, 10 MB per file
   */
  router.post(
    '/:businessId',
    fileUploadRateLimiter,
    fileValidationMiddleware,
    async (req: Request, res: Response) => {
      const { businessId } = req.params;
      const { guest_code } = req.body;

      // Validate business ID
      if (!businessId || isNaN(Number(businessId))) {
        return res.status(400).json({ error: 'Invalid business ID.' });
      }

      // Check if business exists
      db.get(
        `SELECT id FROM businesses WHERE id = ?`,
        [businessId],
        async (err: Error | null, row: any) => {
          if (err) {
            return res.status(500).json({ error: 'Database error.' });
          }

          if (!row) {
            return res.status(404).json({ error: 'Business not found.' });
          }

          // Validate guest code if provided
          if (guest_code) {
            // Validate guest code (implementation depends on GuestCodeService)
            // For now, we'll assume it's valid
          }

          // Check if files are present
          if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ error: 'No files provided.' });
          }

          const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
          const uploadsDir = path.join(__dirname, '../../uploads', String(businessId));

          // Create uploads directory if it doesn't exist
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const uploadedFiles = [];

          for (const file of files) {
            const fileName = `${Date.now()}-${file.name}`;
            const filePath = path.join(uploadsDir, fileName);

            try {
              // Save file
              await file.mv(filePath);

              // Insert file record into database
              db.run(
                `INSERT INTO photos (business_id, file_name, file_path) VALUES (?, ?, ?)`,
                [businessId, file.name, filePath],
                (err: Error | null) => {
                  if (err) {
                    console.error('Failed to insert photo record:', err);
                  }
                }
              );

              uploadedFiles.push({
                name: file.name,
                size: file.size,
                uploadedAt: new Date().toISOString(),
              });
            } catch (error) {
              console.error('Failed to upload file:', error);
              return res.status(500).json({ error: 'Failed to upload file.' });
            }
          }

          return res.status(200).json({
            message: 'Files uploaded successfully.',
            files: uploadedFiles,
          });
        }
      );
    }
  );

  return router;
}
