import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { YahooFantasyAPI } from '@/lib/yahoo-api';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  console.log('API Route - Session check:', {
    hasSession: !!session,
    hasAccessToken: !!(session as any)?.accessToken,
    sessionKeys: session ? Object.keys(session) : null,
  });
  
  if (!session || !(session as any).accessToken) {
    console.log('❌ No session or access token found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('✅ Making Yahoo API request...');
    const api = new YahooFantasyAPI((session as any).accessToken);
    const data = await api.getUserLeagues();
    console.log('✅ Yahoo API response received:', JSON.stringify(data, null, 2));
    return NextResponse.json({ leagues: data });
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leagues' },
      { status: 500 }
    );
  }
}