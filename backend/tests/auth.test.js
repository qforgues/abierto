const request = require('supertest');
const app = require('../server');
const db = require('../db/database');
const bcrypt = require('bcrypt');
const { generateBusinessCode } = require('../utils/businessCodeGenerator');

describe('Authentication Routes', () => {
    let testBusinessCode;
    let testPassword = 'TestPassword123!';

    beforeAll(async () => {
        // Create a test owner
        testBusinessCode = generateBusinessCode();
        await db.createOwner(testBusinessCode, testPassword);
    });

    afterAll(async () => {
        // Clean up test data
        await db.close();
    });

    describe('POST /api/auth/login', () => {
        test('should return 400 if business code is missing', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ password: testPassword });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Business code and password are required');
        });

        test('should return 400 if password is missing', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ businessCode: testBusinessCode });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Business code and password are required');
        });

        test('should return 401 if business code is invalid', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ businessCode: 'INVALID', password: testPassword });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('Invalid business code or password');
        });

        test('should return 401 if password is incorrect', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ businessCode: testBusinessCode, password: 'WrongPassword123!' });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('Invalid business code or password');
        });

        test('should return 200 and set token cookie on successful login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ businessCode: testBusinessCode, password: testPassword });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Login successful.');
            expect(response.body.owner).toBeDefined();
            expect(response.body.owner.businessCode).toBe(testBusinessCode);
            expect(response.headers['set-cookie']).toBeDefined();
        });

        test('should enforce rate limiting after 5 failed attempts', async () => {
            // Make 5 failed login attempts
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/auth/login')
                    .send({ businessCode: 'INVALID', password: 'wrong' });
            }

            // 6th attempt should be rate limited
            const response = await request(app)
                .post('/api/auth/login')
                .send({ businessCode: 'INVALID', password: 'wrong' });

            expect(response.status).toBe(429);
        });
    });

    describe('POST /api/auth/logout', () => {
        test('should clear token cookie on logout', async () => {
            const response = await request(app)
                .post('/api/auth/logout');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Logout successful.');
        });
    });

    describe('Protected Routes', () => {
        test('should return 401 if no token is provided', async () => {
            const response = await request(app)
                .get('/api/protected');

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('No token provided');
        });

        test('should return 401 if token is invalid', async () => {
            const response = await request(app)
                .get('/api/protected')
                .set('Cookie', 'token=invalid-token');

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('Invalid token');
        });

        test('should allow access with valid token', async () => {
            // First, login to get a valid token
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({ businessCode: testBusinessCode, password: testPassword });

            const cookies = loginResponse.headers['set-cookie'];

            // Use the token to access protected route
            const response = await request(app)
                .get('/api/protected')
                .set('Cookie', cookies);

            expect(response.status).toBe(200);
            expect(response.body.user).toBeDefined();
        });
    });
});
