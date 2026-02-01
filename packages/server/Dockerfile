# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Install dependencies
RUN npm ci --workspace=@hooks/shared --workspace=@hooks/server

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

# Build
RUN npm run build -w @hooks/shared
RUN npm run build -w @hooks/server

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hooks

# Copy built files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/drizzle ./packages/server/drizzle

# Install production dependencies only
RUN npm ci --workspace=@hooks/shared --workspace=@hooks/server --omit=dev

USER hooks

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "packages/server/dist/index.js"]
