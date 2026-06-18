import { getSupabaseServer } from "@/lib/supabase/server";
import type { CanvasCreds } from "@/lib/canvas";

/**
 * The Canvas credentials for the currently signed-in user, read from their own
 * Supabase profile. Per-user by design — there is no shared-env fallback, so
 * one person's token never pulls another person's Canvas.
 */
export async function resolveCanvasCreds(): Promise<CanvasCreds | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;
  try {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb
      .from("profiles")
      .select("canvas_base_url, canvas_token")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.canvas_base_url && data?.canvas_token) {
      return {
        baseUrl: String(data.canvas_base_url).replace(/\/$/, ""),
        token: String(data.canvas_token),
      };
    }
  } catch {
    // not signed in / no profile
  }
  return null;
}
