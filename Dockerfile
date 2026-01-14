# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for building)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY server/ ./server/
COPY client/ ./client/
COPY shared/ ./shared/

# Build server and client
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Remove build dependencies (optional, saves space)
RUN apk del python3 make g++

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 4545

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4545
ENV DB_PATH=/app/data/chat.db

# Volume for persistent data
VOLUME ["/app/data"]

# Health check (use 127.0.0.1 to force IPv4)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4545/health || exit 1

# Start the application
CMD ["node", "dist/server/index.js"]
