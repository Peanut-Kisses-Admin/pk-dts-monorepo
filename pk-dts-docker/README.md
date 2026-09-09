# DTS Docker Deployment

Docker orchestration for the complete Document Tracking System.

## Workspace layout

Keep the repositories as siblings:

```text
pk-dts/
|-- pk-dts-backend/
|-- pk-dts-docker/
`-- pk-dts-frontend/
```

## Production

From `pk-dts/pk-dts-docker`:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Open `http://localhost:3000`.

The production stack keeps the Angular frontend, Nest backend, PostgreSQL, and Redis behind the Nginx gateway. Persistent PostgreSQL data, uploads, and backups remain under `data/` and `backups/`.

## Development with hot reload

The development stack is separate from production and is designed for active coding.

### First start

Build the development dependency images once:

```powershell
cd pk-dts-docker
docker compose -f compose.dev.yaml up -d --build
```

Open:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001/api/v1`

### Normal development

After the first build, do **not** rebuild for normal source changes:

```powershell
docker compose -f compose.dev.yaml up -d
```

Edit files normally in `pk-dts-frontend` or `pk-dts-backend`.

The development containers bind-mount the complete application source trees:

- Angular `.ts`, `.html`, `.scss`, and asset changes use HMR/live reload.
- NestJS `.ts` changes use `start:dev` watch mode and restart the API automatically.
- Project configuration and scripts are visible inside the containers because the whole project is mounted.
- Docker-managed `node_modules` volumes prevent Windows/Linux dependency conflicts.
- Application source changes do not require `docker compose build`.

Watch development logs with:

```powershell
docker compose -f compose.dev.yaml logs -f frontend backend
```

### Restart without rebuilding

Some configuration changes are read only when the development server starts. Restart the affected service without rebuilding:

```powershell
docker compose -f compose.dev.yaml restart frontend
```

or:

```powershell
docker compose -f compose.dev.yaml restart backend
```

For Prisma schema changes, restarting the backend regenerates the Prisma client during startup:

```powershell
docker compose -f compose.dev.yaml restart backend
```

### When a rebuild is required

Rebuild only when dependencies or the development image itself change, for example:

- `package.json`
- `package-lock.json`
- `Dockerfile.dev`
- Node/system package requirements

Then run:

```powershell
docker compose -f compose.dev.yaml up -d --build
```

The frontend dev image uses npm 11 (matching the frontend dependency setup). It tries `npm ci` first. If a stale lockfile is rejected during development, it falls back to `npm install --package-lock=false` inside the image so the dev environment can still start without modifying the repository lockfile. The proper long-term fix for an intentionally changed dependency tree is still to regenerate and commit `pk-dts-frontend/package-lock.json` with npm 11.

If a build fails with a temporary npm `ETIMEDOUT`, retry the same command:

```powershell
docker compose -f compose.dev.yaml up -d --build
```

The development Dockerfiles keep a BuildKit npm download cache and automatically retry transient npm failures, so previously downloaded packages can be reused on the next attempt. Do not run `docker builder prune` while recovering from a flaky connection because that removes the useful build cache.

If dependency volumes need a completely clean reset:

```powershell
docker compose -f compose.dev.yaml down -v
docker compose -f compose.dev.yaml up -d --build
```

Persistent PostgreSQL data, uploads, and backups remain under `data/` and `backups/`. Always verify local data paths before destructive cleanup commands.

## Repository

- `https://github.com/curib123/pk-dts-monorepo.git`
