import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

export async function createAuthenticatedClient() {
  const cookieStore = await cookies();

  // Get Clerk JWT using the proper auth method
  try {
    const { getToken } = await auth();
    const clerkJwt = await getToken({ template: 'supabase' });

    if (!clerkJwt) {
      console.warn("No Clerk JWT found, using unauthenticated client");
      return createClient(cookieStore);
    }

    // Create Supabase client with Clerk JWT
    return createServerClient(
      supabaseUrl!,
      supabaseKey!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${clerkJwt}`,
          },
        },
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    );
  } catch (error) {
    console.error("Failed to get Clerk token:", error);
    return createClient(cookieStore);
  }
}

export function createAdminClient() {
  return createSupabaseClient(
    supabaseUrl!,
    supabaseServiceRoleKey!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
