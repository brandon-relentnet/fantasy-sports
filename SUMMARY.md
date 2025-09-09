# Product and Architecture Summary

## Overview
- Purpose: Provide Yahoo Fantasy Baseball managers a faster, cleaner way to view leagues, standings, team rosters, weekly stats, and matchups after authenticating with Yahoo.
- Audience: Yahoo fantasy players who want consolidated read-only insights without navigating multiple Yahoo pages.
- Value: Streamlined navigation, focused data views, and predictable URLs for quick drill‑downs.

## Core Features
- Yahoo OAuth login via NextAuth (read access only).
- League list and league details (standings, rankings).
- Team views: roster, weekly roster, roster stats, current matchup, matchup history.
- Stat mapping via `lib/yahoo-stat-ids.ts` for human‑readable categories.

## User Flows
1) Sign in with Yahoo → session established via NextAuth.
2) Choose a league from overview → open league standings.
3) Navigate to a team → inspect roster, weekly changes, and matchup context.

## Architecture
- Framework: Next.js 15 (App Router) + TypeScript; React 19.
- Auth: NextAuth at `app/api/auth/[...nextauth]/route.ts`.
- API routes: Server endpoints that proxy/shape Yahoo responses, e.g. `app/api/league/[leagueKey]/route.ts`, `app/api/team/[teamKey]/...` including `current-matchup`, `matchups`, `roster`, `roster/weekly`, `roster/stats`.
- UI pages: `app/league/[leagueKey]/page.tsx`, `app/team/[teamKey]/page.tsx`, root `app/page.tsx` and shared `app/layout.tsx`, `app/providers.tsx`.
- Utilities: `lib/yahoo-api.ts` (Axios + xml2js), `lib/auth.ts`, `lib/logger.ts`.
- HTTPS dev: `server.js` starts an HTTPS Next server using `certificates/localhost.crt|.key` and clears `debug.log` on boot.

## Data Sources
- Yahoo Fantasy Sports API v2 for leagues, standings, teams, rosters, stats, and matchups.
- Tokens/session handled by NextAuth; outbound requests authorized per user session.

## Operational Notes
- Dev: `npm run dev` (HTTP) or `npm run dev:https` (HTTPS via `server.js`).
- Build: `npm run build`; Run: `npm start` (HTTP). For HTTPS in prod, adapt `server.js` with real certs.
- Env vars (in `.env.local`): `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`.

## Non‑Goals (Current Scope)
- No write operations to Yahoo (read‑only UI).
- Baseball focus only; other sports not yet supported.
- No heavy analytics beyond Yahoo-provided stats.

## Near‑Term Enhancements (Optional)
- Add simple caching in `lib/` to ease API rate limits and speed up hot paths.
- Introduce lightweight tests for parsing/mapping and API route guards.
- Enrich matchup views with comparative trends and recent performance.

## API Examples (curl)
- Get leagues for the signed-in user
  - `curl -b cookie.txt -c cookie.txt 'http://localhost:3000/api/leagues'`

- Get league details/standings
  - `curl -b cookie.txt -c cookie.txt 'http://localhost:3000/api/league/<leagueKey>'`
  - `curl -b cookie.txt -c cookie.txt 'http://localhost:3000/api/league/<leagueKey>/standings'`

- Team endpoints
  - `curl -b cookie.txt -c cookie.txt 'http://localhost:3000/api/team/<teamKey>'`
  - `curl -b cookie.txt -c cookie.txt 'http://localhost:3000/api/team/<teamKey>/current-matchup'`
  - `curl -b cookie.txt -c cookie.txt 'http://localhost:3000/api/team/<teamKey>/matchups'`
  - `curl -b cookie.txt -c cookie.txt 'http://localhost:3000/api/team/<teamKey>/roster'`
  - `curl -b cookie.txt -c cookie.txt 'http://localhost:3000/api/team/<teamKey>/roster/weekly'`
  - `curl -b cookie.txt -c cookie.txt 'http://localhost:3000/api/team/<teamKey>/roster/stats'`

Notes
- Authenticate in the browser first so cookies/session are created; then reuse them with `-b/-c`.
- Replace `<leagueKey>` and `<teamKey>` with your Yahoo keys from the UI.

## Request Flow Diagram
```
Browser (user) ──> Next.js page (Server Component)
   │                         │
   │ fetch()                 │
   ▼                         │
app/api/* route ──> lib/yahoo-api.ts ──> Yahoo Fantasy API v2
   │                   (axios + xml2js)
   ▼                         │
 shape/return JSON  <────────┘
   │
   ▼
Render React UI
```

Simplification levers
- Keep API routes thin: delegate mapping/parsing to `lib/yahoo-api.ts`.
- Coalesce related endpoints where possible to reduce round trips.
- Centralize stat-ID mapping in `lib/yahoo-stat-ids.ts`; avoid duplicating logic in pages.
