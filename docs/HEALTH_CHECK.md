# Health Check Endpoint Documentation

## Overview

The health check endpoint is a critical component of the Abierto application that allows monitoring and verification of the application's operational status. This endpoint is essential for cloud deployments, load balancers, and automated monitoring systems.

## Endpoints

### Primary Health Check Endpoint

**URL:** `/api/health`

**Method:** `GET`

**Description:** Returns the current health status of the application with a timestamp.

### Alternative Health Check Endpoint

**URL:** `/health`

**Method:** `GET`

**Description:** Direct health check endpoint available at the root API level for immediate availability checks.

## Request

```bash
curl -X GET http://localhost:5000/api/health
```

## Response

### Successful Response (200 OK)

```json
{
  "status": "healthy",
  "timestamp": "2026-03-23T04:34:51.427Z"
}
```

**Status Code:** `200 OK`

**Response Headers:**
- `Content-Type: application/json`

**Response Body:**
- `status` (string): The health status of the application. Always returns `"healthy"` when the endpoint is accessible.
- `timestamp` (string): ISO 8601 formatted timestamp indicating when the health check was performed.

### Error Response (500 Internal Server Error)

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred during the health check"
}
```

**Status Code:** `500 Internal Server Error`

**Response Headers:**
- `Content-Type: application/json`

**Response Body:**
- `error` (string): Error message indicating the type of error.
- `message` (string): Detailed error description.

## Usage Examples

### Using cURL

```bash
# Basic health check
curl http://localhost:5000/api/health

# With verbose output
curl -v http://localhost:5000/api/health

# With pretty-printed JSON (requires jq)
curl http://localhost:5000/api/health | jq .
```

### Using JavaScript/Fetch API

```javascript
fetch('http://localhost:5000/api/health')
  .then(response => response.json())
  .then(data => {
    console.log('Health Status:', data.status);
    console.log('Timestamp:', data.timestamp);
  })
  .catch(error => console.error('Health check failed:', error));
```

### Using Postman

1. Create a new GET request
2. Enter the URL: `http://localhost:5000/api/health`
3. Click "Send"
4. Verify the response status is 200 and the body contains `status: "healthy"`

### Using Node.js

```javascript
const http = require('http');

http.get('http://localhost:5000/api/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data));
  });
}).on('error', (err) => {
  console.error('Health check failed:', err);
});
```

## Monitoring and Deployment

### Cloud Service Integration

When deploying to cloud services like Render.com or Railway.app, configure the health check endpoint as follows:

**Render.com:**
- Health Check Path: `/api/health`
- Expected Status Code: `200`
- Check Interval: `30` seconds (default)

**Railway.app:**
- Health Check Path: `/api/health`
- Expected Status Code: `200`
- Check Interval: `30` seconds (default)

### Load Balancer Configuration

For load balancers, configure the health check as:

```
Protocol: HTTP
Path: /api/health
Port: 5000 (or configured PORT)
Expected Status: 200
Interval: 30 seconds
Timeout: 5 seconds
Healthy Threshold: 2 consecutive checks
Unhealthy Threshold: 3 consecutive checks
```

### Monitoring Tools

#### Using Uptime Monitoring Services

1. **UptimeRobot:**
   - Monitor Type: HTTP(s)
   - URL: `https://abierto.example.com/api/health`
   - Check Interval: 5 minutes
   - Alert Contacts: Configure as needed

2. **Pingdom:**
   - Check Type: HTTP
   - URL: `https://abierto.example.com/api/health`
   - Check Interval: 1 minute
   - Expected HTTP Code: 200

#### Using Application Performance Monitoring (APM)

Integrate with APM tools like:
- New Relic
- Datadog
- Sentry
- LogRocket

These tools can automatically monitor the health endpoint and alert on failures.

## Testing

### Running Tests

```bash
# Run all health check tests
npm test -- health.test.js

# Run with verbose output
npm test -- health.test.js --verbose

# Run with coverage
npm test -- health.test.js --coverage
```

### Test Cases

The health check endpoint includes the following test cases:

1. **Successful Response Test:** Verifies that the endpoint returns a 200 status code with the correct response structure.
2. **Timestamp Validation Test:** Ensures the timestamp is a valid ISO 8601 string.
3. **Content Type Test:** Confirms the response is JSON.
4. **Direct Endpoint Test:** Validates the `/health` endpoint works correctly.
5. **Timestamp Recency Test:** Ensures the timestamp is recent and accurate.

## Performance Considerations

- **Response Time:** The health check endpoint should respond in less than 100ms under normal conditions.
- **Resource Usage:** The endpoint uses minimal resources and should not impact application performance.
- **Caching:** Health check responses are not cached to ensure real-time status reporting.

## Security Considerations

- **No Authentication Required:** The health check endpoint does not require authentication to allow monitoring systems to access it.
- **Rate Limiting:** Consider implementing rate limiting on the health check endpoint to prevent abuse.
- **HTTPS:** Always use HTTPS in production environments.

## Troubleshooting

### Health Check Returns 500 Error

1. Check the server logs for error messages.
2. Verify the server is running and accessible.
3. Ensure the Express application is properly initialized.
4. Check for any middleware that might be interfering with the endpoint.

### Health Check Timeout

1. Verify the server is running on the correct port.
2. Check network connectivity and firewall rules.
3. Ensure the URL is correct (e.g., `http://localhost:5000/api/health`).
4. Check for any reverse proxy or load balancer configuration issues.

### Timestamp Issues

1. Verify the server's system time is correct.
2. Check for timezone configuration issues.
3. Ensure the `Date` object is being used correctly in the endpoint.

## Future Enhancements

- **Detailed Health Status:** Expand the endpoint to include database connectivity, cache status, and external service availability.
- **Metrics Collection:** Add performance metrics such as response time and memory usage.
- **Custom Health Checks:** Allow plugins or modules to register custom health checks.
- **Health History:** Maintain a history of health check results for trend analysis.

## Related Documentation

- [Express.js Documentation](https://expressjs.com/)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [ISO 8601 Date Format](https://en.wikipedia.org/wiki/ISO_8601)
- [Cloud Deployment Guide](./DEPLOYMENT.md)
