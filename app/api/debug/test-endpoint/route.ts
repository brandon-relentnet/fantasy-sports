import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { YahooFantasyAPI } from '@/lib/yahoo-api';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter required' }, { status: 400 });
    }

    const api = new YahooFantasyAPI((session as any).accessToken);
    
    // Make the raw request and return everything
    const data = await api.makeRequest(endpoint);
    
    return NextResponse.json({ 
      endpoint,
      success: true,
      rawData: data,
      analysis: {
        hasData: !!data,
        dataType: typeof data,
        keys: data ? Object.keys(data) : [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json(
      { 
        endpoint: new URL(request.url).searchParams.get('endpoint'),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}