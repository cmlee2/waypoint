import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Google OAuth callback handler
 * Receives the authorization code from Google and exchanges it for tokens
 */

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('🔄 OAuth Callback:', {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
    error
  });

  if (error) {
    // User denied the authorization or other error
    console.error('❌ OAuth Error:', error);
    return NextResponse.redirect(
      new URL(`/trips/new?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return NextResponse.redirect(
      new URL('/trips/new?error=no_code', request.url)
    );
  }

  // Verify state parameter (protection against CSRF)
  const storedStateCookie = request.cookies.get('google_oauth_state')?.value;
  let returnUrl = '/trips/new'; // Default return URL

  console.log('🔍 State verification:', {
    hasStoredState: !!storedStateCookie,
    receivedState: state
  });

  if (storedStateCookie) {
    try {
      const storedState = JSON.parse(storedStateCookie);
      console.log('📋 Stored state data:', {
        state: storedState.state,
        returnUrl: storedState.returnUrl
      });

      if (!state || !storedState.state || state !== storedState.state) {
        console.error('❌ State mismatch');
        return NextResponse.redirect(
          new URL('/trips/new?error=invalid_state', request.url)
        );
      }
      returnUrl = storedState.returnUrl || '/trips/new';
    } catch (e) {
      console.error('❌ Failed to parse state cookie:', e);
      return NextResponse.redirect(
        new URL('/trips/new?error=invalid_state', request.url)
      );
    }
  } else if (!state || !storedStateCookie || state !== storedStateCookie) {
    console.error('❌ State validation failed');
    return NextResponse.redirect(
      new URL('/trips/new?error=invalid_state', request.url)
    );
  }

  try {
    console.log('🔑 Exchanging authorization code for token...');
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
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google/oauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL(`/trips/new?error=token_exchange_failed`, request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token received:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope
    });

    // Verify that all required scopes were granted
    const requiredScopes = [
      'https://www.googleapis.com/auth/photoslibrary.readonly',
      'https://www.googleapis.com/auth/photoslibrary'
    ];

    const grantedScopes = tokenData.scope ? tokenData.scope.split(' ') : [];
    const missingScopes = requiredScopes.filter(scope => !grantedScopes.includes(scope));

    console.log('🔍 Scope verification:', {
      grantedScopes,
      requiredScopes,
      missingScopes,
      hasAllScopes: missingScopes.length === 0
    });

    if (missingScopes.length > 0) {
      console.error('❌ Missing required scopes:', missingScopes);
      // Clear the state cookie even on error
      const errorResponse = NextResponse.redirect(
        new URL(
          `/trips/new?error=insufficient_scopes&missing=${encodeURIComponent(missingScopes.join(','))}`,
          request.url
        )
      );
      errorResponse.cookies.delete('google_oauth_state');
      return errorResponse;
    }

    // Clear the state cookie
    const response = NextResponse.redirect(
      new URL(`${returnUrl}?google_token=${tokenData.access_token}`, request.url)
    );
    response.cookies.delete('google_oauth_state');

    console.log('🎯 Redirecting to:', returnUrl);
    return response;

    // Option 2: Store in database and pass a session ID (more secure, recommended for production)
    // In production, store tokenData.refresh_token in database linked to userId
    // Then redirect with a short-lived session ID instead of the actual token
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/trips/new?error=callback_error', request.url)
    );
  }
}
