import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function getAccessTokenOrUnauthorized(): Promise<string | NextResponse> {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return token;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

