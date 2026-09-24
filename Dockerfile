# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first (leverages Docker layer cache)
COPY package*.json ./
RUN npm ci

# Copy source, static data, and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build


# ── Stage 2: Production runtime ─────────────────────────────────────────────
# node:20-slim (Debian) is required — @temporalio/core-bridge ships a glibc
# native binary (ld-linux-x86-64.so.2) that is incompatible with Alpine musl.
FROM node:20-slim AS runtime

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy static supplier JSON data files (resolved by supplier.activities.ts at runtime)
COPY --from=builder /app/src/data ./src/data

# Non-root user for security (Debian-style commands)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

EXPOSE 3000

# Default command starts the API server.
# Override with: docker compose run worker
CMD ["node", "dist/server.js"]
