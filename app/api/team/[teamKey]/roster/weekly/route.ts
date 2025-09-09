import { NextResponse } from 'next/server';

// Deprecated endpoint: Yahoo team filters are date-based rather than weekly.
// Use `/api/team/[teamKey]/roster?date=YYYY-MM-DD` instead.
export async function GET() {
  return NextResponse.json(
    {
      error: 'Deprecated endpoint. Use /api/team/[teamKey]/roster?date=YYYY-MM-DD',
      replacement: '/api/team/[teamKey]/roster?date=YYYY-MM-DD'
    },
    { status: 410 }
  );
}
