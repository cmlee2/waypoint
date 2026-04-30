import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { updateSession } from '@/utils/supabase/middleware'

const isProtectedRoute = createRouteMatcher(['/(.*)', '/trips(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect()

  // Update Supabase session (refreshes the token)
  return await updateSession(request)
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next (Next.js internals)
     * - any request for a static asset with a file extension
     */
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
}
