import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { YahooFantasyAPI } from '@/lib/yahoo-api';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamKey: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { teamKey } = await params;
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    
    const api = new YahooFantasyAPI((session as any).accessToken);
    const data = await api.getWeeklyRoster(teamKey, week || undefined);
    return NextResponse.json({ weeklyRoster: data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly roster' },
      { status: 500 }
    );
  }
}