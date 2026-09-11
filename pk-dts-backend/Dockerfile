FROM node:20-bookworm AS build

WORKDIR /app

# Use the full Bookworm Node image so OpenSSL and CA certificates are already
# available. This avoids reaching Debian package mirrors during every build,
# which is unreliable on networks that block or intermittently fail apt traffic.
RUN openssl version && test -f /etc/ssl/certs/ca-certificates.crt

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

FROM node:20-bookworm AS runtime

WORKDIR /app

# Keep runtime independent from apt mirrors as well. Prisma requires OpenSSL,
# and the non-slim Bookworm image already provides the required system tooling.
RUN openssl version && test -f /etc/ssl/certs/ca-certificates.crt

COPY --from=build /app /app

ENV NODE_ENV=production \
    APP_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    SKIP_BUILD=true

EXPOSE 3000

CMD ["sh", "-c", "node scripts/prepare-postgres-startup.js && node scripts/prisma-db-push-retry.js && npm run prisma:seed && npm run start:prod"]
