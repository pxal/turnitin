FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV CI=true
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY .env ./
COPY backend/package.json ./backend/package.json
COPY backend/prisma ./backend/prisma
COPY frontend/package.json ./frontend/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS backend-prod-deps
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY backend/prisma ./backend/prisma
RUN npm ci --omit=dev --ignore-scripts --workspace backend
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma

FROM node:20-bookworm-slim AS backend-runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=backend-prod-deps /app/node_modules ./node_modules
COPY --from=backend-prod-deps /app/package.json ./package.json
COPY --from=backend-prod-deps /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
RUN mkdir -p /app/backend/data /app/backend/uploads /app/backend/private-uploads
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema backend/prisma/schema.prisma && node backend/dist/src/server.js"]

FROM node:20-bookworm-slim AS frontend-runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./frontend/.next/static
COPY --from=build /app/frontend/public ./frontend/public
CMD ["node", "frontend/server.js"]
