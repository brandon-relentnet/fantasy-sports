# Repository Guidelines

## Project Structure & Module Organization
- App code in `app/` (Next.js App Router). Pages: `app/page.tsx`, layouts and providers; API routes under `app/api/` (e.g., `app/api/league/[leagueKey]/route.ts`, `app/api/team/[teamKey]/...`).
- Shared utilities in `lib/` (e.g., `lib/yahoo-api.ts`, `lib/auth.ts`, `lib/logger.ts`).
- Type declarations in `types/` (e.g., `types/next-auth.d.ts`).
- Config: `next.config.js`, `tsconfig.json`, `next-env.d.ts`.
- Local HTTPS dev helper: `server.js` with certs in `certificates/`.

## Build, Test, and Development Commands
- `npm run dev` — Standard Next.js dev server at `http://localhost:3000`.
- `npm run dev:https` — Uses `server.js` to run an HTTPS Next server at `https://localhost:3000` with local certs. Required files: `certificates/localhost.crt` and `certificates/localhost.key`.
- `npm run build` — Build production bundle.
- `npm start` — Run production Next server after build (`next start`). For HTTPS in production, adapt `server.js` and provide real certs.
- `npm run lint` — Run Next.js/ESLint checks.

Environment: copy `.env.local` from README. Required keys: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`.

## Coding Style & Naming Conventions
- Language: TypeScript, React 19, Next.js 15 (App Router).
- Indentation: 2 spaces; prefer named exports. File names: camelCase for utilities (`yahooApi`), kebab-case for folders; Next.js route files as `route.ts`.
- API route params use bracketed folders (e.g., `app/api/team/[teamKey]/route.ts`).
- Use `lib/logger.ts` for server-side logs; avoid console noise in production paths.
- Run `npm run lint` before submitting; fix autofixable issues.

## Testing Guidelines
- No formal test suite present. Add lightweight tests colocated under `__tests__/` or `*.test.ts` when introducing complex logic (e.g., parsing, mappers).
- Prefer dependency-free assertions (Node test runner) or add Jest only if required by scope.
- For API routes, validate with curl/httpie examples and edge cases (missing params, auth states).

## Commit & Pull Request Guidelines
- Commits: concise, present tense. Prefix by scope when helpful: `app:`, `lib:`, `api:`, `types:`, `build:`, `docs:` (e.g., `api: add weekly roster endpoint`).
- One logical change per commit; include rationale if behavior changes.
- PRs: include description, screenshots of UI changes, reproduction steps, and links to issues. Note any env or migration changes.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local`; keep keys out of logs.
- Yahoo OAuth: ensure redirect URI matches `NEXTAUTH_URL/api/auth/callback/yahoo`.
- HTTPS dev: `server.js` reads certs from `certificates/`; regenerate with OpenSSL when needed. Do not commit real certs.
- Rate limits: consider caching in `lib/` when adding high-traffic endpoints.
