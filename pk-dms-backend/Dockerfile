FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000

COPY package*.json ./
RUN sh -c 'for attempt in 1 2 3; do \
      npm ci && exit 0; \
      if [ "$attempt" -eq 3 ]; then exit 1; fi; \
      delay=$((attempt * 10)); \
      echo "npm ci failed on attempt $attempt, retrying in ${delay}s..."; \
      sleep "$delay"; \
    done'

COPY nest-cli.json tsconfig*.json ./
COPY scripts ./scripts
COPY prisma ./prisma
COPY src ./src

ENV PRISMA_SCHEMA_PATH=prisma/schema.postgresql.prisma

RUN node scripts/prisma-env.js generate \
    && npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app

ENV NODE_ENV=production \
    APP_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    SKIP_BUILD=true

EXPOSE 3000

CMD ["sh", "-c", "node scripts/prepare-postgres-startup.js && node scripts/prisma-db-push-retry.js && npm run prisma:seed && npm run start:prod"]
