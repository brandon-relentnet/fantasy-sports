Repository Guidelines
=====================

Project Structure & Module Organization
---------------------------------------
- Core Next.js App Router code lives in `app/`, with pages such as `app/page.tsx`, API handlers under `app/api/`, and layout/provider configuration co-located.
- Shared logic belongs in `lib/`; leverage existing modules like `lib/yahoo-api.ts` and `lib/logger.ts` before adding new helpers.
- Types reside in `types/` (e.g., `types/player.ts`), and configuration sits at repo root (`next.config.js`, `tsconfig.json`, `next-env.d.ts`).
- Custom HTTPS dev support uses `server.js` with certs in `certificates/`. Keep real keys out of the repo.

Build, Test, and Development Commands
-------------------------------------
- `npm run dev` starts the standard dev server on `http://localhost:3000`.
- `npm run dev:https` launches the HTTPS variant driven by `server.js`; ensure `certificates/localhost.crt` and `.key` exist.
- `npm run build` compiles the production bundle; run before `npm start`.
- `npm start` serves the built app; pair with `npm run build` in CI.
- `npm run lint` executes Next.js/ESLint rules; fix warnings before pushing.

Coding Style & Naming Conventions
---------------------------------
- Use TypeScript with React 19 and Next.js 15 semantics; stick to functional components.
- Indentation is 2 spaces. Default to named exports and camelCase file names for utilities; keep Next route segments in kebab-case folders.
- Import shared utilities from `lib/` rather than re-creating logic. Route handlers must call `getAccessTokenOrUnauthorized()` for auth gating.
- Avoid console noise in server paths; log via `lib/logger.ts`.

Testing Guidelines
------------------
- No formal suite exists; add Node test runner files under `__tests__/` or `*.test.ts` when introducing complex logic (e.g., stat parsing).
- Prefer dependency-light assertions; document new test commands in this file if introduced.
- For API routes, validate edge cases with curl/httpie. Favor date-based roster filters; weekly endpoints return HTTP 410.

Commit & Pull Request Guidelines
--------------------------------
- Craft present-tense commits, optionally scoped (`api:`, `lib:`, `app:`). Group changes logically; avoid unrelated bundles.
- Pull requests must describe the change, reference issues, and include screenshots or JSON samples for UI/API updates.
- Note environment or migration impacts explicitly, including required `.env.local` keys (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`).

Security & Configuration Tips
-----------------------------
- Never commit secrets. Share sensitive values via `.env.local` and align Yahoo OAuth redirect URIs with `NEXTAUTH_URL/api/auth/callback/yahoo`.
- Respect Yahoo rate limits; consider caching via `lib/` when touching high-traffic endpoints.
