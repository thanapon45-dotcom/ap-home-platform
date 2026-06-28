/**
 * TASK-201: SupabaseClient singleton
 * Wraps @supabase/supabase-js with service-role key (full access, bypass RLS)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@shared/logger";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("[SupabaseClient] SUPABASE_URL or SUPABASE_SERVICE_KEY is missing");
  }

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  logger.info("[SupabaseClient] client initialized");
  return _client;
}

/** Reset singleton (for testing) */
export function resetSupabaseClient(): void {
  _client = null;
}
