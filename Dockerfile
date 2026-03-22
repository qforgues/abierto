FROM node:18-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000
VOLUME ["/app/backend/db"]
VOLUME ["/app/backend/uploads"]
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
CMD ["node", "backend/server.js"]
