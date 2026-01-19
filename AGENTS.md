# Repository Guidelines

## Project Structure & Module Organization
- `apps/web/`: Next.js 14 app (App Router) with API routes under `apps/web/src/app/api/` and UI in `apps/web/src/components/`.
- `apps/web/prisma/`: Prisma schema and migrations.
- `apps/worker/`: Python RQ worker; job handlers in `apps/worker/src/jobs/` and integrations in `apps/worker/src/services/`.
- `apps/web/public/`: Static 3D assets (Thema models, textures).
- Root: `docker-compose.yml` for local orchestration.

## Build, Test, and Development Commands
- `docker compose up --build`: Run full stack (web, worker, db, redis, migrations).
- `docker compose up -d db redis`: Start only data services for local dev.
- `cd apps/web && npm run dev`: Start Next.js dev server.
- `cd apps/web && npm run build`: Production build; `npm run start` to serve.
- `cd apps/web && npm run lint`: ESLint via Next.js.
- `cd apps/web && npm run db:generate`: Generate Prisma client.
- `cd apps/web && npm run db:migrate`: Apply dev migrations.
- `cd apps/worker && python -m src.worker`: Run RQ worker (venv required).

## Coding Style & Naming Conventions
- TypeScript/TSX: 2-space indentation, React components in `PascalCase`, hooks `useX`.
- Python: 4-space indentation, modules `snake_case.py`.
- Keep API route files named `route.ts` under `apps/web/src/app/api/...`.
- Prefer `npm run lint` and Prisma commands for consistency.

## Testing Guidelines
- No dedicated test framework is configured yet. Add tests when introducing new logic.
- If adding tests, place them next to modules or in a `__tests__/` folder and document the command in this file.

## Commit & Pull Request Guidelines
- Commit messages in history are short and descriptive (often Korean). Follow that pattern: concise, imperative, include scope if helpful.
- PRs should include a clear description, linked issue (if any), and screenshots for UI changes.
- Mention migration or env var changes explicitly.

## Configuration & Secrets
- Copy `.env.example` to `apps/web/.env` and `apps/worker/.env` and set real values.
- S3 integration is optional; mock services are available in the worker.
