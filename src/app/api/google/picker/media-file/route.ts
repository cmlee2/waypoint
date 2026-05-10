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

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google access token found' }, { status: 401 });
  }

  const baseUrl = request.nextUrl.searchParams.get('baseUrl');
  const width = request.nextUrl.searchParams.get('width');
  const height = request.nextUrl.searchParams.get('height');

  if (!baseUrl) {
    return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 });
  }

  let url = baseUrl;
  if (width && height) {
    url += `=w${width}-h${height}`;
  } else if (width) {
    url += `=w${width}`;
  } else if (height) {
    url += `=h${height}`;
  } else {
    url += '=d';
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text().catch(() => '');
    return NextResponse.json(
      {
        error: 'Failed to proxy Google Photos media file',
        details: error || response.statusText,
      },
      { status: response.status }
    );
  }

  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}
