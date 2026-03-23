/**
 * Generate a secure alphanumeric business code
 * Format: 6-8 uppercase alphanumeric characters
 * @returns {string} Generated business code
 */
function generateBusinessCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = Math.floor(Math.random() * 3) + 6; // Random length between 6-8
    let code = '';

    for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return code;
}

/**
 * Validate business code format
 * @param {string} code - The business code to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidBusinessCode(code) {
    if (!code || typeof code !== 'string') {
        return false;
    }
    // Must be 6-8 alphanumeric characters
    return /^[A-Z0-9]{6,8}$/.test(code.toUpperCase());
}

module.exports = {
    generateBusinessCode,
    isValidBusinessCode
};
