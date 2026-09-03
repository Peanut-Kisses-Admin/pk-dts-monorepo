# PK DTS Monorepo

PK DTS is the unified monorepo for the Peanut Kisses Document Tracking System, including its backend API, frontend application, and Docker deployment stack.

This repository contains the PK Document Tracking System source tree:

- `pk-dms-backend` — NestJS API
- `pk-dms-frontend` — Angular application
- `pk-dms-docker` — Docker Compose deployment stack

The source directories keep their existing names so Docker build contexts and deployment commands remain compatible.

## Legacy repositories

The original backend, frontend, and Docker Git histories remain preserved in their existing remote repositories. Their local Git metadata was archived outside this working tree during the monorepo conversion.
