import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { YahooFantasyAPI } from '@/lib/yahoo-api';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { leagueKey: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { leagueKey } = params;
    const api = new YahooFantasyAPI((session as any).accessToken);
    const data = await api.getStandings(leagueKey);
    return NextResponse.json({ standings: data });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    );
  }
}
