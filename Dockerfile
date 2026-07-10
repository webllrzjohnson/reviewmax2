# Multi-stage build for Next.js standalone (smaller image than Nixpacks default).
#
# Coolify: use Build Pack "Dockerfile". Do NOT override the start command —
# the default CMD is `node server.js`. Set "Ports Exposes" to 3000.
# Health check path: /api/health
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# --no-lint: ESLint runs in CI/dev (`npm run lint`); saves ~30–60s and RAM during Docker build.
# Coolify build timeout must be ≥10 min — compile alone can take 3+ minutes before typecheck.
RUN NODE_OPTIONS=--max-old-space-size=4096 npx next build --no-lint

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat chromium nss freetype harfbuzz ca-certificates ttf-freefont curl
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/public/pins && \
    chown -R nextjs:nodejs /app/public
    
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres
# nextjs user must write image optimization cache at runtime
RUN mkdir -p .next/cache && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
