# Yahoo Fantasy Baseball App

A Next.js application that allows users to login with their Yahoo Fantasy Sports account and view their fantasy baseball data.

## Setup Instructions

### 1. Register Your App with Yahoo

1. Go to [Yahoo Developer Network](https://developer.yahoo.com/apps/)
2. Click "Create an App"
3. Fill in the application details:
   - Application Name: Your app name
   - Application Type: Web-based
   - Redirect URI: `http://localhost:3000/api/auth/callback/yahoo`
   - API Permissions: Select "Fantasy Sports" and choose "Read" permission
4. After creating, note down your Client ID and Client Secret

### 2. Configure Environment Variables

Update the `.env.local` file with your Yahoo app credentials:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-key-here
YAHOO_CLIENT_ID=your-yahoo-client-id
YAHOO_CLIENT_SECRET=your-yahoo-client-secret
```

To generate a secure `NEXTAUTH_SECRET`, run:
```bash
openssl rand -base64 32
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application (frontend + backend)

Start backend and frontend in parallel:

```bash
npm run dev:all
```

Frontend runs at https://localhost:3000 and calls backend at http://localhost:4000.
If you see CORS errors, set CORS_ORIGINS in env (comma-separated), e.g.:

```
CORS_ORIGINS=https://localhost:3000,http://localhost:3000
```

## Features

- **OAuth Authentication**: Secure login with Yahoo account
- **League Overview**: View all your fantasy baseball leagues
- **League Standings**: See current standings and team rankings
- **Team Management**: View your team roster and player statistics
- **Player Stats**: Track batting averages, home runs, RBIs, and more
- **Matchup History**: Review past and current matchups

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth configuration
│   │   ├── leagues/              # League data endpoints
│   │   ├── league/[leagueKey]/   # Specific league endpoints
│   │   └── team/[teamKey]/       # Team-specific endpoints
│   ├── league/[leagueKey]/       # League detail page
│   ├── team/[teamKey]/           # Team detail page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── providers.tsx             # Session provider
├── lib/
│   └── yahoo-api.ts              # Yahoo Fantasy API client
└── types/
    └── next-auth.d.ts            # TypeScript declarations
```

## API Integration

The backend uses the Yahoo Fantasy Sports API v2 to fetch:
- User leagues and teams
- League standings and settings
- Team rosters and player statistics
- Matchup results and schedules

## Technologies Used

- Frontend: **Next.js 15** App Router, Tailwind CSS UI
- Backend: **Express** + TypeScript, Axios, xml2js

## Production Deployment

For production deployment:

1. Update `NEXTAUTH_URL` to your production URL
2. Add your production URL to Yahoo app's redirect URIs
3. Use secure environment variables for secrets
4. Deploy to your preferred hosting platform (Vercel, Netlify, etc.)

## Troubleshooting

- **Authentication Issues**: Ensure your Yahoo app redirect URI matches exactly with `NEXTAUTH_URL/api/auth/callback/yahoo`
- **API Rate Limits**: Yahoo has rate limits on their API. Consider caching in backend
- **Missing Data**: Some API responses may vary based on league settings and current season status

## Notes on Roster Filters

- The Yahoo UI provides date-based filters (Today or a specific calendar date). This app supports:
  - `Today` roster and stats: `GET /api/team/<teamKey>/roster`
  - `Date`-based roster and stats: `GET /api/team/<teamKey>/roster?date=YYYY-MM-DD`
- Weekly coverage is deprecated in this project. The old weekly endpoint now returns 410 with guidance.
