import { cookies } from 'next/headers';

/**
 * Utility to refresh Google OAuth access tokens
 */
export async function refreshGoogleAccessToken(refreshToken: string) {
  try {
    console.log('🔄 Refreshing Google access token...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Failed to refresh Google token:', errorData);
      return null;
    }

    const data = await response.json();
    console.log('✅ Google access token refreshed successfully');

    // Update the access token cookie
    const cookieStore = await cookies();
    cookieStore.set('google_access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });

    return data.access_token;
  } catch (error) {
    console.error('❌ Error refreshing Google token:', error);
    return null;
  }
}
