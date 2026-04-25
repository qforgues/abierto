/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * @param {string} password - The password to validate
 * @returns {Object} Validation result with isValid flag and error messages
 */
function validatePassword(password) {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return {
            isValid: false,
            errors: ['Password is required.']
        };
    }

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long.');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter.');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter.');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number.');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character.');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    validatePassword
};
