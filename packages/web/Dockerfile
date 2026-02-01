# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN npm ci --workspace=@hooks/shared --workspace=@hooks/web

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

# Build shared package first
RUN npm run build -w @hooks/shared

# Build web with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @hooks/web

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Next.js standalone build
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "packages/web/server.js"]
