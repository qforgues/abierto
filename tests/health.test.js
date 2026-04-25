const request = require('supertest');
const app = require('../backend/server');

describe('GET /api/health', () => {
    it('should return 200 and a health message', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Service is up and running');
    });

    it('should return valid JSON response', async () => {
        const res = await request(app).get('/api/health');
        expect(res.type).toMatch(/json/);
        expect(typeof res.body).toBe('object');
    });

    it('should not have any errors in response', async () => {
        const res = await request(app).get('/api/health');
        expect(res.body).not.toHaveProperty('error');
    });
});
