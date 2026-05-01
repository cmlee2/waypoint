import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * OAuth flow for Google Photos integration
 * This endpoint initiates the OAuth flow and handles the callback
 */

const GOOGLE_PHOTOS_SCOPE = 'https://www.googleapis.com/auth/photoslibrary.readonly https://www.googleapis.com/auth/photoslibrary';
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google/oauth/callback`;

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'authorize') {
    // Step 1: Redirect user to Google OAuth consent screen
    const state = crypto.randomUUID(); // Use random state for security

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID || '');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', GOOGLE_PHOTOS_SCOPE);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    console.log('OAuth Request:', {
      scope: GOOGLE_PHOTOS_SCOPE,
      redirectUri: REDIRECT_URI,
      clientId: process.env.GOOGLE_CLIENT_ID
    });

    // Store state in session or database for verification
    // For simplicity, we'll return it in the response
    const response = NextResponse.redirect(authUrl.toString());

    // Set state cookie for verification
    response.cookies.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
    });

    return response;
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { code, state } = body;

  if (!code) {
    return NextResponse.json({ error: 'Authorization code required' }, { status: 400 });
  }

  // Verify state (in production, check against stored state)
  const storedState = request.cookies.get('google_oauth_state')?.value;
  if (state && storedState && state !== storedState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return NextResponse.json(
        { error: 'Failed to exchange token', details: error },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    // In production, store the refresh token securely in your database
    // For now, we'll return the access token
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json(
      { error: 'OAuth exchange failed' },
      { status: 500 }
    );
  }
}
