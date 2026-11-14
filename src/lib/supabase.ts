import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Nur serverseitig verwenden: nutzt den Secret Key (RLS ohne Policies sperrt den Browser aus).
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SECRET_KEY fehlt in .env.local");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
