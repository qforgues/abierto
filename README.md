# Abierto v1.4

Abierto is a web application designed to facilitate the creation and management of businesses with photo uploads. This version includes Docker support for easy deployment to cloud services like Render or Railway.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Docker (for containerized deployment)
- Docker Compose (optional, for local development)

## Installation

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd abierto
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. Create a `.env` file in the backend directory with the following variables:
   ```
   NODE_ENV=development
   PORT=5000
   JWT_SECRET=your-secret-key-change-in-production
   API_URL=http://localhost:5000/api
   FRONTEND_URL=http://localhost:3000
   DB_PATH=./abierto.db
   ```

5. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

6. In a new terminal, start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

7. Open your browser and navigate to `http://localhost:3000`.

## Docker Deployment

### Building the Docker Image

1. Ensure you are in the root directory of the project.

2. Build the Docker image:
   ```bash
   docker build -t abierto .
   ```

### Running the Docker Container

1. Run the Docker container:
   ```bash
   docker run -p 5000:5000 \
     -e NODE_ENV=production \
     -e JWT_SECRET=your-production-secret-key \
     -e API_URL=https://abierto.example.com/api \
     -e FRONTEND_URL=https://abierto.example.com \
     abierto
   ```

   **Important:** Replace `your-production-secret-key` with a strong, randomly generated secret key. Do NOT use the default value in production.

2. Verify the application is running by accessing the health check endpoint:
   ```bash
   curl http://localhost:5000/api/health
   ```

   You should receive a response:
   ```json
   {"status": "UP"}
   ```

### Environment Variables

The following environment variables should be set when running the Docker container:

- **NODE_ENV**: Set to `production` for production deployments.
- **JWT_SECRET**: A strong, randomly generated secret key for signing JWT tokens. **This must be set securely and never hardcoded.**
- **API_URL**: The base URL for the API (e.g., `https://abierto.example.com/api`).
- **FRONTEND_URL**: The URL where the frontend is hosted (e.g., `https://abierto.example.com`).
- **PORT**: The port on which the application runs (default: 5000).
- **DB_PATH**: The path to the SQLite database file (default: `./abierto.db`).

### Deploying to Render or Railway

#### Render.com

1. Connect your GitHub repository to Render.
2. Create a new Web Service.
3. Set the build command to: `npm install && cd frontend && npm run build && cd ..`
4. Set the start command to: `node backend/server.js`
5. Add the following environment variables in the Render dashboard:
   - `NODE_ENV=production`
   - `JWT_SECRET=<your-strong-secret-key>`
   - `API_URL=https://<your-render-url>/api`
   - `FRONTEND_URL=https://<your-render-url>`
6. Deploy the service.

#### Railway.app

1. Connect your GitHub repository to Railway.
2. Create a new project.
3. Add a service and select your repository.
4. Set the start command to: `node backend/server.js`
5. Add the following environment variables in the Railway dashboard:
   - `NODE_ENV=production`
   - `JWT_SECRET=<your-strong-secret-key>`
   - `API_URL=https://<your-railway-url>/api`
   - `FRONTEND_URL=https://<your-railway-url>`
6. Deploy the service.

## API Endpoints

### Health Check

- **GET** `/api/health`
  - Returns the health status of the application.
  - Response: `{"status": "UP"}`

### Create Business

- **POST** `/api/businesses`
  - Creates a new business.
  - Request body:
    ```json
    {
      "name": "Business Name",
      "password": "secure-password"
    }
    ```
  - Response:
    ```json
    {
      "businessId": 1,
      "businessCode": "ABC123",
      "name": "Business Name",
      "message": "Business created successfully"
    }
    ```

### Owner Login

- **POST** `/api/login`
  - Authenticates an owner and returns a JWT token.
  - Request body:
    ```json
    {
      "businessCode": "ABC123",
      "password": "secure-password"
    }
    ```
  - Response:
    ```json
    {
      "businessId": 1,
      "businessCode": "ABC123",
      "name": "Business Name",
      "message": "Login successful"
    }
    ```

### Generate Guest Code

- **POST** `/api/guest-codes`
  - Generates a guest code for a business (requires authentication).
  - Response:
    ```json
    {
      "guestCode": "123456",
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "message": "Guest code created successfully"
    }
    ```

### Logout

- **POST** `/api/logout`
  - Logs out the current user by clearing the authentication token.
  - Response:
    ```json
    {
      "message": "Logged out successfully"
    }
    ```

## Security Considerations

1. **JWT Secret**: Always use a strong, randomly generated secret key for `JWT_SECRET` in production. Never commit this to version control.
2. **HTTPS**: Ensure your application is served over HTTPS in production.
3. **Rate Limiting**: The application includes rate limiting on login attempts (5 attempts per 15 minutes) and general API requests (100 requests per minute).
4. **Password Requirements**: Passwords must be at least 8 characters long.
5. **Token Expiry**: JWT tokens expire after 7 days.
6. **Guest Code Expiry**: Guest codes expire 7 days from creation.

## Database

The application uses SQLite for data storage. The database file is created automatically when the application starts.

### Database Schema

- **businesses**: Stores business information including business code, name, and password hash.
- **guest_codes**: Stores guest codes and their expiration dates.
- **photos**: Stores information about uploaded photos.

## Troubleshooting

### Health Check Fails

If the health check endpoint returns an error, ensure that:
1. The application is running on the correct port (default: 5000).
2. The `curl` command is available in the Docker container.
3. The application has started successfully.

### Database Connection Issues

If the application fails to connect to the database:
1. Ensure the database file path is correct.
2. Check that the application has write permissions to the database directory.
3. Verify that the database file is not corrupted.

### Port Already in Use

If port 5000 is already in use, you can specify a different port:
```bash
docker run -p 8000:5000 \
  -e PORT=5000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-production-secret-key \
  abierto
```

Then access the application on `http://localhost:8000`.

## Contributing

Contributions are welcome! Please follow the existing code style and include tests for new features.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
