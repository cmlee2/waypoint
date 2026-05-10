import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { refreshGoogleAccessToken } from '@/utils/google/auth';

async function getAccessToken(request: NextRequest): Promise<string | null> {
  let accessToken = request.cookies.get('google_access_token')?.value;
  const refreshToken = request.cookies.get('google_refresh_token')?.value;

  if (!accessToken && refreshToken) {
    accessToken = await refreshGoogleAccessToken(refreshToken);
  }

  return accessToken;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google access token found' }, { status: 401 });
  }

  const { sessionId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const pageSize = searchParams.get('pageSize') || '50';
  const pageToken = searchParams.get('pageToken');

  const url = new URL('https://photospicker.googleapis.com/v1/mediaItems');
  url.searchParams.set('sessionId', sessionId);
  url.searchParams.set('pageSize', pageSize);
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      {
        error: data?.error?.message || response.statusText,
        details: data,
        status: response.status,
      },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}
