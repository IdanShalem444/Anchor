import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses RLS and is the ONLY trusted way to
// change a user's plan (the prevent_plan_self_change trigger allows writes from
// the service_role). Server-only: never import this into a client component.
// Used exclusively by the Stripe webhook.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isAdminConfigured = !!(url && serviceKey);

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isAdminConfigured) return null;
  return createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
