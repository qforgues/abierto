const request = require('supertest');
const app = require('../server');

/**
 * Health Check Endpoint Tests
 * 
 * Tests for the /api/health endpoint to ensure it returns
 * the correct status code and response structure.
 */
describe('Health Check Endpoint', () => {
  /**
   * Test: Successful health check response
   * Verifies that the endpoint returns a 200 status code
   * and a JSON object with 'status' and 'timestamp' fields.
   */
  test('GET /api/health should return 200 with healthy status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body.status).toBe('healthy');
  });

  /**
   * Test: Response structure validation
   * Verifies that the timestamp is a valid ISO 8601 string.
   */
  test('GET /api/health should return a valid ISO 8601 timestamp', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    // Verify timestamp is a valid ISO 8601 string
    const timestamp = new Date(response.body.timestamp);
    expect(timestamp instanceof Date && !isNaN(timestamp)).toBe(true);
  });

  /**
   * Test: Response content type
   * Verifies that the endpoint returns JSON content.
   */
  test('GET /api/health should return JSON content type', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.type).toBe('application/json');
  });

  /**
   * Test: Direct health endpoint
   * Verifies that the health endpoint is also available at /health
   */
  test('GET /health should return 200 with healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body.status).toBe('healthy');
  });

  /**
   * Test: Response time consistency
   * Verifies that the timestamp is recent (within the last second).
   */
  test('GET /api/health timestamp should be recent', async () => {
    const beforeRequest = new Date();
    const response = await request(app).get('/api/health');
    const afterRequest = new Date();

    const responseTime = new Date(response.body.timestamp);

    // Timestamp should be between before and after request times
    expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime() - 1000);
    expect(responseTime.getTime()).toBeLessThanOrEqual(afterRequest.getTime() + 1000);
  });
});
