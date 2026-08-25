# Multi-stage Dockerfile for the Keyd modular monolith.
# `dev` target is used by docker-compose for hot-reload local development.
# `runner` target is a slim production image.

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# ---- dev (hot reload) ----
FROM base AS dev
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- deps (production install) ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

# ---- build ----
FROM base AS build
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- runner (production) ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/tsconfig.json ./tsconfig.json
# `src` is needed by the tsx-run seed script (SEED_ON_BOOT) which imports from src/.
COPY --from=build /app/src ./src
COPY package.json ./
EXPOSE 3000
# On boot: apply DB migrations (idempotent). If SEED_ON_BOOT=true, seed demo data
# ONLY when the database is empty (never wipes existing data). Then start the server.
CMD ["sh", "-c", "(npx prisma migrate deploy || echo 'migrate deploy failed, continuing') && if [ \"$SEED_ON_BOOT\" = \"true\" ]; then SEED_SKIP_IF_POPULATED=true npm run db:seed || echo 'seed skipped/failed'; fi; npm run start"]
