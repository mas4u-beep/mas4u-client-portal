import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase connection.
 *
 * The URL and anon key are provided at build time (see vite.config.ts `define`).
 * The anon (public) key is safe to ship in the client bundle — access is governed
 * by Row Level Security policies on the database.
 *
 * If the values are absent (e.g. local dev without config), `supabase` is null and
 * the app transparently falls back to browser localStorage so nothing breaks.
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

// The whole application database is stored as a single JSON row so that every
// user in the office reads and writes the exact same shared state.
export const APP_STATE_TABLE = 'app_state';
export const APP_STATE_ID = 1;
