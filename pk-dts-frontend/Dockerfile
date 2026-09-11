FROM node:20-bookworm-slim AS build

WORKDIR /app

ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_fetch_timeout=300000 \
    npm_config_maxsockets=5

COPY package*.json ./
RUN sh -c 'set -e; \
      for attempt in 1 2 3 4; do \
        echo "Installing npm 11 (attempt ${attempt}/4)"; \
        if npm install -g npm@11.16.0 --no-audit --no-fund; then \
          break; \
        fi; \
        if [ "$attempt" -eq 4 ]; then \
          echo "Unable to install npm 11 after 4 attempts" >&2; \
          exit 1; \
        fi; \
        delay=$((attempt * 10)); \
        echo "npm upgrade failed; retrying in ${delay}s..."; \
        sleep "$delay"; \
      done; \
      for attempt in 1 2 3 4; do \
        echo "npm ci attempt ${attempt}/4"; \
        if npm ci --prefer-offline --no-audit --no-fund; then \
          exit 0; \
        fi; \
        if [ "$attempt" -eq 4 ]; then \
          echo "Frontend dependency installation failed after 4 attempts" >&2; \
          exit 1; \
        fi; \
        delay=$((attempt * 10)); \
        echo "Dependency install failed; retrying in ${delay}s..."; \
        sleep "$delay"; \
      done'

COPY . .

ARG PUBLIC_API_URL=http://localhost:3001/api/v1
RUN printf "BACKEND_API_BASE_URL=%s\n" "$PUBLIC_API_URL" > .env \
    && npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/sakai-ng/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
