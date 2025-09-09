import { NextResponse } from 'next/server';
import { YahooFantasyAPI } from '@/lib/yahoo-api';
import { getAccessTokenOrUnauthorized } from '@/lib/apiRoute';

export async function GET() {
  const token = await getAccessTokenOrUnauthorized();
  if (typeof token !== 'string') return token;

  try {
    const api = new YahooFantasyAPI(token);
    const data = await api.getUserLeagues();
    return NextResponse.json({ leagues: data });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch leagues' },
      { status: 500 }
    );
  }
}
