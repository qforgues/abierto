# Abierto Backend API

The Abierto backend is an Express.js API that provides authentication, business management, and photo upload functionality for the Abierto web application.

## Features

- **Owner Authentication**: Secure login using business code and password
- **Rate Limiting**: Protection against brute force attacks
- **JWT Tokens**: Secure token-based authentication with 7-day expiry
- **Business Management**: Create and manage businesses
- **Photo Management**: Upload and manage business photos
- **Database Backups**: Automated SQLite backups to AWS S3
- **Health Checks**: Endpoint to verify application status

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Initialize the database:
   ```bash
   npm run db:init
   ```

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The server will run on `http://localhost:5000` by default.

## API Endpoints

### Authentication

#### Login
- **POST** `/api/auth/login`
- **Body**: `{ "businessCode": "ABC123", "password": "YourPassword123!" }`
- **Response**: JWT token in httpOnly cookie

#### Logout
- **POST** `/api/auth/logout`
- **Response**: Clears authentication cookie

### Health Check

- **GET** `/api/health`
- **Response**: `{ "status": "OK", "timestamp": "2024-01-01T00:00:00Z" }`

### Protected Routes

All protected routes require a valid JWT token in the `token` cookie.

- **GET** `/api/protected` - Example protected route

## Password Requirements

Passwords must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Business Code Format

Business codes are:
- Alphanumeric (A-Z, 0-9)
- 6-8 characters long
- Automatically generated and unique
- Case-insensitive (stored as uppercase)

## Rate Limiting

Login attempts are rate-limited to:
- **5 attempts per minute** per IP address
- Returns 429 (Too Many Requests) when limit is exceeded

## JWT Token

- **Expiry**: 7 days from issuance
- **Storage**: httpOnly cookie (secure, not accessible via JavaScript)
- **Secret**: Set via `JWT_SECRET` environment variable

## Database

The application uses SQLite with the following tables:

- **owners**: Owner accounts with business codes and password hashes
- **businesses**: Business information linked to owners
- **photos**: Photos uploaded for businesses
- **backup_logs**: Records of database backups

### Initialize Database

```bash
npm run db:init
```

### Reset Database (Development Only)

```bash
npm run db:reset
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Environment Variables

See `.env.example` for all available configuration options:

- `NODE_ENV`: Environment (development, staging, production)
- `PORT`: Server port (default: 5000)
- `DATABASE_PATH`: Path to SQLite database file
- `JWT_SECRET`: Secret key for JWT signing
- `CORS_ORIGIN`: Allowed CORS origin
- `AWS_*`: AWS S3 credentials for backups
- `SMTP_*`: Email configuration for notifications

## Deployment

The application is designed to be deployed on:
- Render.com
- Railway.app
- Any Node.js hosting platform

### Docker

A Dockerfile is provided for containerized deployment. Build and run:

```bash
docker build -t abierto-backend .
docker run -p 5000:5000 abierto-backend
```

## Security Considerations

1. **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
2. **JWT Tokens**: Tokens are stored in httpOnly cookies to prevent XSS attacks
3. **Rate Limiting**: Protects against brute force attacks
4. **CORS**: Configured to allow only specified origins
5. **Environment Variables**: Sensitive data is stored in environment variables

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing or invalid input)
- `401`: Unauthorized (invalid credentials or expired token)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

## License

MIT
