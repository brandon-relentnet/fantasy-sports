import { getServerSession } from 'next-auth';
import { NextResponse, NextRequest } from 'next/server';
import { YahooFantasyAPI } from '@/lib/yahoo-api';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { teamKey: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { teamKey } = params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const api = new YahooFantasyAPI((session as any).accessToken);
    const data = date ? await api.getRosterByDate(teamKey, date) : await api.getRoster(teamKey);
    // Basic schema check for first few items
    const sample = Array.isArray(data) ? data.slice(0, 2) : [];
    return NextResponse.json({ roster: data, sample, coverage: date ? { type: 'date', date } : { type: 'today' } });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch roster' },
      { status: 500 }
    );
  }
}
