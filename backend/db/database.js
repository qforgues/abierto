const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Initialize database connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'abierto.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
    }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

/**
 * Promisified database methods for easier async/await usage
 */
const database = {
    /**
     * Run a query (INSERT, UPDATE, DELETE)
     */
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    },

    /**
     * Get a single row
     */
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    /**
     * Get all rows
     */
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    },

    /**
     * Retrieve owner by business code
     * @param {string} businessCode - The alphanumeric business code (6-8 characters)
     * @returns {Promise<Object|null>} Owner object or null if not found
     */
    getOwnerByBusinessCode: async (businessCode) => {
        try {
            const query = 'SELECT * FROM owners WHERE business_code = ? LIMIT 1';
            const result = await database.get(query, [businessCode.toUpperCase()]);
            return result || null;
        } catch (error) {
            console.error('Error retrieving owner by business code:', error);
            throw error;
        }
    },

    /**
     * Retrieve owner by ID
     * @param {number} id - The owner ID
     * @returns {Promise<Object|null>} Owner object or null if not found
     */
    getOwnerById: async (id) => {
        try {
            const query = 'SELECT * FROM owners WHERE id = ? LIMIT 1';
            const result = await database.get(query, [id]);
            return result || null;
        } catch (error) {
            console.error('Error retrieving owner by ID:', error);
            throw error;
        }
    },

    /**
     * Create a new owner with hashed password
     * @param {string} businessCode - The alphanumeric business code
     * @param {string} password - The plaintext password to hash
     * @param {Object} additionalData - Additional owner data
     * @returns {Promise<Object>} Created owner with ID
     */
    createOwner: async (businessCode, password, additionalData = {}) => {
        try {
            // Hash the password with bcrypt (10 salt rounds)
            const passwordHash = await bcrypt.hash(password, 10);

            const query = `
                INSERT INTO owners (business_code, password_hash, created_at, updated_at)
                VALUES (?, ?, datetime('now'), datetime('now'))
            `;
            const result = await database.run(query, [businessCode.toUpperCase(), passwordHash]);
            return { id: result.id, businessCode: businessCode.toUpperCase() };
        } catch (error) {
            console.error('Error creating owner:', error);
            throw error;
        }
    },

    /**
     * Update owner password
     * @param {number} ownerId - The owner ID
     * @param {string} newPassword - The new plaintext password
     * @returns {Promise<Object>} Update result
     */
    updateOwnerPassword: async (ownerId, newPassword) => {
        try {
            const passwordHash = await bcrypt.hash(newPassword, 10);
            const query = 'UPDATE owners SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?';
            const result = await database.run(query, [passwordHash, ownerId]);
            return result;
        } catch (error) {
            console.error('Error updating owner password:', error);
            throw error;
        }
    },

    /**
     * Get all businesses for an owner
     * @param {number} ownerId - The owner ID
     * @returns {Promise<Array>} Array of business objects
     */
    getBusinessesByOwnerId: async (ownerId) => {
        try {
            const query = 'SELECT * FROM businesses WHERE owner_id = ? ORDER BY created_at DESC';
            const results = await database.all(query, [ownerId]);
            return results;
        } catch (error) {
            console.error('Error retrieving businesses:', error);
            throw error;
        }
    },

    /**
     * Get a business by ID
     * @param {number} businessId - The business ID
     * @returns {Promise<Object|null>} Business object or null if not found
     */
    getBusinessById: async (businessId) => {
        try {
            const query = 'SELECT * FROM businesses WHERE id = ? LIMIT 1';
            const result = await database.get(query, [businessId]);
            return result || null;
        } catch (error) {
            console.error('Error retrieving business:', error);
            throw error;
        }
    },

    /**
     * Create a new business
     * @param {number} ownerId - The owner ID
     * @param {Object} businessData - Business data (name, description, etc.)
     * @returns {Promise<Object>} Created business with ID
     */
    createBusiness: async (ownerId, businessData) => {
        try {
            const { name, description, category } = businessData;
            const query = `
                INSERT INTO businesses (owner_id, name, description, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            `;
            const result = await database.run(query, [ownerId, name, description || null, category || null]);
            return { id: result.id, ...businessData };
        } catch (error) {
            console.error('Error creating business:', error);
            throw error;
        }
    },

    /**
     * Close database connection
     */
    close: () => {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Database connection closed.');
                    resolve();
                }
            });
        });
    }
};

module.exports = database;
