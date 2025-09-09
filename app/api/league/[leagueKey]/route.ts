import { NextResponse } from 'next/server';
import { YahooFantasyAPI } from '@/lib/yahoo-api';
import { getAccessTokenOrUnauthorized } from '@/lib/apiRoute';

export async function GET(
  request: Request,
  { params }: { params: { leagueKey: string } }
) {
  const token = await getAccessTokenOrUnauthorized();
  if (typeof token !== 'string') return token;

  try {
    const { leagueKey } = params;
    const api = new YahooFantasyAPI(token);
    const data = await api.getLeague(leagueKey);
    return NextResponse.json({ league: data });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch league' },
      { status: 500 }
    );
  }
}
