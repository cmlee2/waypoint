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

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { error: 'No Google access token found. Please re-authorize.' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const maxItemCount = Number(body.maxItemCount || 15);

  const response = await fetch('https://photospicker.googleapis.com/v1/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pickingConfig: {
        maxItemCount: String(Number.isFinite(maxItemCount) ? maxItemCount : 15),
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      {
        error: 'Failed to create Google Photos Picker session',
        details: data?.error?.message || response.statusText,
        status: response.status,
      },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}
