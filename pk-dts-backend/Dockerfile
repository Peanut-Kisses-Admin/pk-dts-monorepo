FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN set -eux; \
    for source_file in /etc/apt/sources.list /etc/apt/sources.list.d/debian.sources; do \
      if [ -f "$source_file" ]; then \
        sed -i 's|http://deb.debian.org|https://deb.debian.org|g' "$source_file"; \
      fi; \
    done; \
    attempt=1; \
    until apt-get -o Acquire::Retries=3 -o Acquire::https::Timeout=30 update \
      && apt-get install -y --no-install-recommends openssl ca-certificates; do \
      if [ "$attempt" -ge 4 ]; then \
        echo "apt package installation failed after ${attempt} attempts" >&2; \
        exit 1; \
      fi; \
      delay=$((attempt * 10)); \
      echo "apt package installation failed; retrying in ${delay}s..."; \
      rm -rf /var/lib/apt/lists/*; \
      sleep "$delay"; \
      attempt=$((attempt + 1)); \
    done; \
    rm -rf /var/lib/apt/lists/*

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

RUN set -eux; \
    for source_file in /etc/apt/sources.list /etc/apt/sources.list.d/debian.sources; do \
      if [ -f "$source_file" ]; then \
        sed -i 's|http://deb.debian.org|https://deb.debian.org|g' "$source_file"; \
      fi; \
    done; \
    attempt=1; \
    until apt-get -o Acquire::Retries=3 -o Acquire::https::Timeout=30 update \
      && apt-get install -y --no-install-recommends openssl ca-certificates; do \
      if [ "$attempt" -ge 4 ]; then \
        echo "apt package installation failed after ${attempt} attempts" >&2; \
        exit 1; \
      fi; \
      delay=$((attempt * 10)); \
      echo "apt package installation failed; retrying in ${delay}s..."; \
      rm -rf /var/lib/apt/lists/*; \
      sleep "$delay"; \
      attempt=$((attempt + 1)); \
    done; \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app

ENV NODE_ENV=production \
    APP_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    SKIP_BUILD=true

EXPOSE 3000

CMD ["sh", "-c", "node scripts/prepare-postgres-startup.js && node scripts/prisma-db-push-retry.js && npm run prisma:seed && npm run start:prod"]
