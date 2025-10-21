import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let cachedBrowserClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (cachedBrowserClient) return cachedBrowserClient
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }
  cachedBrowserClient = createClient(supabaseUrl, supabaseAnonKey)
  return cachedBrowserClient
}

// Server-side client with service role key for admin operations
export function getServerSupabase(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(supabaseUrl, serviceRoleKey)
}
