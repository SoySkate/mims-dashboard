# syntax=docker/dockerfile:1

# ---- base ----
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- deps (cached unless lockfile changes) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholders only. All pages are dynamic (cookies/DB at request time), so the
# build never connects anywhere; these just satisfy module-load checks. REAL values come from
# the container env at runtime (docker-compose env_file).
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV SESSION_SECRET=build-time-placeholder-not-used-at-runtime
RUN npm run build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Standalone server + static assets + public.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
