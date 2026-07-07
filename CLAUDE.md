# Claude Code Project Guide

Claude Code should follow the same collaboration rules as Codex and other agents. This file is intentionally aligned with `AGENTS.md`; keep both files consistent when project rules change.

## Project Context

The app is a course learning assistant platform.

- Frontend: `client/`, React 18 + TypeScript + Vite + Tailwind CSS + React Router + TanStack Query.
- Backend: `server/`, FastAPI + SQLAlchemy + Pydantic.
- Database: SQLite for local development, PostgreSQL/Supabase for shared deployments.
- File uploads: stored under `server/uploads/` and served from `/uploads`.

Core product areas:

- Auth and profile
- Dashboard
- Courses and materials
- Course chat
- Learning plans and tasks
- Knowledge base
- Forum posts, comments, tags

## First Rules

- Do not reset, revert, delete, or reformat unrelated changes.
- Check the current file before editing it. The repo may already contain uncommitted work from another person or agent.
- Keep changes scoped to the requested feature or bug.
- Prefer existing patterns over new architecture.
- Do not commit secrets, `.env`, local databases, uploads, build output, `node_modules`, or cache directories.
- If a task changes both frontend and backend contracts, update both sides in the same change.
- If an assumption is uncertain, inspect the code or ask before making a risky change.

## Common Commands

Frontend:

```bash
cd client
npm install
npm run dev
npm run build
npm run analyze
```

Backend:

```bash
cd server
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
copy .env.example .env
python -m app.seed
uvicorn main:app --reload --port 8000
pytest
```

Use `npm run build` after frontend TypeScript or bundling changes. Use `pytest` after backend model, router, service, or database changes.

## Frontend Standards

- Put API calls in `client/src/api/client.ts`.
- Expose reusable data access through `client/src/hooks/api.ts` with TanStack Query.
- Use Query cache invalidation after mutations instead of manual page refreshes.
- Keep route-level pages lazy-loaded through `client/src/router.tsx`.
- Use existing skeleton components from `client/src/components/skeleton/` for loading states.
- Use `ErrorBoundary` and Toast patterns already present in `client/src/components/`.
- Add hover/focus prefetch for details pages when list cards link to those details.
- For large lists or trees, use virtualization instead of rendering every row.
- For user text editors, preserve local draft/autosave behavior when touching editor state.
- Keep UI copy in Chinese unless the surrounding file clearly uses English.
- Prefer existing utility classes and component style over introducing a new UI system.

## Backend Standards

- Route modules live under `server/app/routers/`.
- SQLAlchemy models live in `server/app/models.py`.
- Pydantic schemas live in `server/app/schemas.py`.
- Shared app settings live in `server/app/config.py`.
- Keep REST endpoints predictable: list, get, create, update, delete should use conventional HTTP methods and status behavior.
- Validate user ownership for authenticated resources.
- Do not hard-code database credentials.
- Keep SQLite development working unless a task explicitly targets PostgreSQL-only behavior.
- When adding upload behavior, validate filenames, content handling, and cleanup paths.

## Database Notes

Local development can use:

```env
DATABASE_URL=sqlite:///./app.db
```

Shared environments can use PostgreSQL/Supabase:

```env
DATABASE_URL=postgresql://...
```

If the schema changes, update the model and any compatibility logic in `server/app/database.py` if needed. Seed data should stay lightweight and safe to rerun.

## Collaboration Workflow

Before editing:

1. Inspect relevant files.
2. Check whether there are existing uncommitted changes in the files you need.
3. Identify whether the change is frontend-only, backend-only, or full-stack.

While editing:

1. Keep patches small and reviewable.
2. Avoid opportunistic rewrites.
3. Keep naming consistent with nearby code.
4. Do not remove behavior unless the request explicitly asks for it.

Before finishing:

1. Run the smallest relevant verification command.
2. Report what changed.
3. Report what was tested.
4. Mention any known limitation or follow-up.

## Git Safety

- Never run `git reset --hard`, `git checkout -- .`, or equivalent destructive cleanup unless explicitly requested by the user.
- Do not stage or commit unrelated files.
- If generated files changed unintentionally, verify whether they are ignored before touching them.
- If a file has unrelated user edits, work around them instead of overwriting them.

## Documentation Standards

- Keep `README.md` accurate when startup commands, environment variables, major routes, or architecture change.
- Document new environment variables in `server/.env.example`.
- Add short comments only where code is non-obvious.
- Prefer concise, practical docs over long theoretical explanations.

## Claude-Specific Notes

- Prefer small, explicit edits over broad file rewrites.
- If using a plan, keep it current as steps complete.
- When unsure whether a change belongs to the current task, leave it untouched and mention it separately.
- Do not hide failed commands; report them with the relevant error and next step.

## Quality Bar

A change is not done until it is implemented, typechecked or tested where relevant, and summarized clearly.

Minimum checks:

- Frontend behavior or TypeScript changes: `cd client && npm run build`
- Bundle analyzer config changes: `cd client && npm run analyze`
- Backend API/model/service changes: `cd server && pytest`
- README/docs-only changes: no build required unless commands or generated docs are changed

