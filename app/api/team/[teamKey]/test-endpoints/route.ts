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
    
    // Test all possible endpoints to find fantasy points
    await api.testFantasyPointsEndpoints(teamKey);
    
    return NextResponse.json({ 
      message: 'Endpoint testing complete. Check debug.log for results.',
      instruction: 'Look for any endpoints that return player_points or fantasy point data'
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to test endpoints' },
      { status: 500 }
    );
  }
}
