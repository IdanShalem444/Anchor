"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";
import type { UserProfile, UserSettings } from "@/lib/types";

const DEFAULT_SETTINGS: UserSettings = {
  notifications: true,
  weekStart: "monday",
  reduceMotion: false,
};

/**
 * Bridges Supabase Auth → the Zustand stores (Supabase mode only).
 * - reflects the live session into useAuth
 * - hydrates the workspace JSONB into useData on sign-in
 * - debounce-saves workspace changes back to Supabase
 * Renders nothing. In on-device mode it's a no-op.
 */
export function SupabaseBridge() {
  const loadedFor = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    if (!sb) return;
    let unsubData: (() => void) | undefined;

    async function applySession(userId: string, email: string) {
      if (loadedFor.current === userId) return;

      const { data: prof } = await sb!
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const profile: UserProfile = {
        id: userId,
        name: prof?.name || email.split("@")[0] || "Student",
        email: prof?.email || email,
        avatarUrl: prof?.avatar_url ?? null,
        plan: (prof?.plan as UserProfile["plan"]) || "free",
        createdAt: prof?.created_at ? new Date(prof.created_at).getTime() : Date.now(),
      };
      const settings: UserSettings = prof?.settings || DEFAULT_SETTINGS;
      useAuth.getState()._setSession(profile, settings);

      const { data: ws } = await sb!
        .from("workspaces")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      const data = ws?.data && Object.keys(ws.data).length ? ws.data : null;
      if (data) {
        useData.setState((s) => ({ byUser: { ...s.byUser, [userId]: data } }));
      }
      loadedFor.current = userId;

      // Persist store changes back to Supabase (debounced).
      unsubData?.();
      unsubData = useData.subscribe((state) => {
        if (loadedFor.current !== userId) return;
        const bucket = state.byUser[userId];
        if (!bucket) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          sb!
            .from("workspaces")
            .upsert({ user_id: userId, data: bucket, updated_at: new Date().toISOString() })
            .then(undefined, () => {});
        }, 1200);
      });
    }

    sb.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      if (s?.user) await applySession(s.user.id, s.user.email || "");
      useAuth.getState()._markResolved();
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        applySession(session.user.id, session.user.email || "");
      } else {
        loadedFor.current = null;
        unsubData?.();
        useAuth.getState()._clearSession();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      unsubData?.();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return null;
}
