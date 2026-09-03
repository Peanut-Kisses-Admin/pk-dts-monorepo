# DTS Docker Deployment

Docker orchestration repository for the complete Document Tracking System.

## Workspace layout

Keep the three repositories as siblings:

```text
pk-dms/
|-- pk-dms-backend/
|-- pk-dms-docker/
`-- pk-dms-frontend/
```

The Docker repository keeps deployment configuration and runtime data. Application source remains in the independent backend and frontend repositories.

## Start

From `pk-dms/pk-dms-docker`:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Open `http://localhost:3000`. The Nginx gateway serves the frontend and routes
`/api/v1` and `/uploads` to the private backend service.

The production stack uses one internal Docker network:

- Nginx is the only service published to the host, on port `3000`.
- The Angular frontend, Nest backend, PostgreSQL, and Redis are internal.
- Redis provides the shared HTTP and authenticated-user cache with an
  ephemeral 128 MB LRU policy.
- PostgreSQL data, uploads, and backups keep their existing persistent mounts.

## Development

```powershell
docker compose -f compose.dev.yaml up -d --build
```

Persistent PostgreSQL data, uploads, and backups remain under `data/` and `backups/` in this repository and are ignored by Git.

## Repositories

- Backend: `https://github.com/Peanut-Kisses-Admin/pk-dms-backend.git`
- Docker: `https://github.com/Peanut-Kisses-Admin/pk-dms-docker.git`
- Frontend: `https://github.com/Peanut-Kisses-Admin/pk-dms-frontend.git`
