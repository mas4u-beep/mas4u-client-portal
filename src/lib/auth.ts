import { supabase } from './supabaseClient';

/**
 * Supabase Auth helpers (Stage B — secure login).
 *
 * This module is the foundation for real email + password authentication. It is
 * intentionally NOT wired into the login screen yet: activating it must happen
 * together with locking the database (Row Level Security) and creating staff
 * auth accounts, and must be tested with a real login so nobody gets locked out.
 * See SECURITY_PLAN.md for the activation steps.
 *
 * Once activated, the app requires an authenticated Supabase session for all
 * data access, so the public anon key alone can no longer read or write data.
 */

export type AuthResult = { ok: boolean; error?: string };

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'שירות ההתחברות אינו מוגדר' };
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSessionEmail(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email ?? null;
}

/** Fires whenever the auth session changes (sign in / sign out / token refresh). */
export function onAuthChange(cb: (email: string | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user?.email ?? null);
  });
  return () => data.subscription.unsubscribe();
}
