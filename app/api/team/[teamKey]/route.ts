import { NextResponse } from 'next/server';
import { YahooFantasyAPI } from '@/lib/yahoo-api';
import { getAccessTokenOrUnauthorized } from '@/lib/apiRoute';

export async function GET(
  request: Request,
  { params }: { params: { teamKey: string } }
) {
  const token = await getAccessTokenOrUnauthorized();
  if (typeof token !== 'string') return token;

  try {
    const { teamKey } = params;
    const api = new YahooFantasyAPI(token);
    const data = await api.getTeam(teamKey);
    return NextResponse.json({ team: data });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}
