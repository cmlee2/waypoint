import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Get Google access token from secure cookie
 * This endpoint allows the frontend to access the token without exposing it in URLs
 */

export async function GET(request: NextRequest) {
  // Require authentication to access the token
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const accessToken = request.cookies.get('google_access_token')?.value;
  const refreshToken = request.cookies.get('google_refresh_token')?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'No access token found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    access_token: accessToken,
    has_refresh_token: !!refreshToken
  });
}

/**
 * Clear Google tokens from cookies
 * Call this when user logs out or revokes access
 */

export async function DELETE(request: NextRequest) {
  // Require authentication to clear tokens
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });

  response.cookies.delete('google_access_token');
  response.cookies.delete('google_refresh_token');

  return response;
}