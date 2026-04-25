import { Database } from 'sqlite3';
import { promisify } from 'util';

/**
 * Service for managing guest codes
 */
export class GuestCodeService {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Generate a random guest code (6 alphanumeric characters)
   * @returns A random guest code
   */
  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new guest code for a business
   * @param businessId - The ID of the business
   * @returns The created guest code
   * @throws Error if database insertion fails
   */
  async createGuestCode(businessId: number): Promise<string> {
    const code = this.generateCode();
    const createdAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO guest_codes (business_id, code, created_at) VALUES (?, ?, ?)`,
        [businessId, code, createdAt],
        function (err: Error | null) {
          if (err) {
            const errorMessage = `Failed to create guest code for business ${businessId}: ${err.message}`;
            console.error(errorMessage);
            reject(new Error(errorMessage));
          } else {
            resolve(code);
          }
        }
      );
    });
  }

  /**
   * Validate a guest code
   * @param code - The guest code to validate
   * @returns The business ID if valid, null otherwise
   */
  async validateGuestCode(code: string): Promise<number | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT business_id, created_at FROM guest_codes WHERE code = ?`,
        [code],
        (err: Error | null, row: any) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            // Check if the code has expired (7 days)
            const createdAt = new Date(row.created_at);
            const now = new Date();
            const expiryTime = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

            if (now.getTime() - createdAt.getTime() > expiryTime) {
              resolve(null); // Code has expired
            } else {
              resolve(row.business_id);
            }
          }
        }
      );
    });
  }

  /**
   * Delete an expired guest code
   * @param code - The guest code to delete
   */
  async deleteExpiredCode(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM guest_codes WHERE code = ?`,
        [code],
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Clean up all expired guest codes
   */
  async cleanupExpiredCodes(): Promise<void> {
    const expiryTime = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const cutoffDate = new Date(Date.now() - expiryTime).toISOString();

    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM guest_codes WHERE created_at < ?`,
        [cutoffDate],
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}
