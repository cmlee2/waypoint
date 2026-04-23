import { type NextRequest } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { updateSession } from '@/utils/supabase/middleware'

export default clerkMiddleware(async (auth, request) => {
  // Update Supabase session (refreshes the token)
  return await updateSession(request)
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/(api|trpc)(.*)',
  ],
}
