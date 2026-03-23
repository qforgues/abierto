# Use the official Node.js image as the base image
FROM node:14

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for backend
COPY backend/package*.json ./backend/
# Install backend dependencies
RUN cd backend && npm install

# Copy package.json and package-lock.json for frontend
COPY frontend/package*.json ./frontend/
# Install frontend dependencies
RUN cd frontend && npm install

# Copy the entire backend and frontend code into the container
COPY backend ./backend
COPY frontend ./frontend

# Build the frontend
RUN cd frontend && npm run build

# Expose the application on port 5000
EXPOSE 5000

# Set environment variables for production
# Note: Sensitive values like JWT_SECRET should be provided at runtime via environment variables
# or a secure vault, not hardcoded in the Dockerfile
ENV NODE_ENV=production
ENV API_URL=https://abierto.example.com/api

# Health check command
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "backend/app.js"]
