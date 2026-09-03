FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install -g npm@11.16.0 && npm ci

COPY . .

ARG PUBLIC_API_URL=http://localhost:3001/api/v1
RUN printf "BACKEND_API_BASE_URL=%s\n" "$PUBLIC_API_URL" > .env \
    && npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/sakai-ng/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
