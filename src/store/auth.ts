"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Plan, UserProfile, UserSettings } from "@/lib/types";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Result = { ok: boolean; error?: string; needsConfirm?: boolean };

interface StoredUser {
  profile: UserProfile;
  settings: UserSettings;
}

interface AuthState {
  /** Populated solely by <SupabaseBridge/> from the live session. */
  users: Record<string, StoredUser>;
  currentUserId: string | null;
  remember: boolean;
  /** False until the session has been resolved on load. */
  sessionResolved: boolean;

  signUp: (name: string, email: string, password: string) => Promise<Result>;
  signIn: (email: string, password: string, remember: boolean) => Promise<Result>;
  signInWithGoogle: () => Promise<Result>;
  signOut: () => void;
  requestReset: (email: string) => Promise<Result>;
  resetPassword: (newPassword: string) => Promise<Result>;

  updateProfile: (patch: Partial<UserProfile>) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  changePassword: (newPassword: string) => Promise<Result>;
  /** Start a Stripe Checkout for a paid plan (redirects on success). */
  startCheckout: (plan: Plan) => Promise<Result>;
  /** Open the Stripe billing portal to manage / cancel (redirects). */
  openPortal: () => Promise<Result>;
  redeem: (codeStr: string) => Promise<Result>;
  deleteAccount: () => Promise<void>;

  // session bridge
  _setSession: (profile: UserProfile, settings: UserSettings) => void;
  _clearSession: () => void;
  _markResolved: () => void;
  /** Reflect a plan change locally (after redeem / checkout return) without a
   *  Supabase write — the plan is set authoritatively server-side. */
  _setPlanLocal: (plan: Plan) => void;
}

const NOT_CONFIGURED: Result = {
  ok: false,
  error: "Accounts aren't enabled yet — add your Supabase keys to .env.local.",
};

/** Push a profile change up to Supabase (fire-and-forget). */
function syncProfile(id: string, patch: Partial<UserProfile>, settings?: UserSettings) {
  const sb = getSupabase();
  if (!sb) return;
  const row: Record<string, unknown> = { id };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.plan !== undefined) row.plan = patch.plan;
  if (settings) row.settings = settings;
  sb.from("profiles").update(row).eq("id", id).then(undefined, () => {});
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      users: {},
      currentUserId: null,
      remember: true,
      sessionResolved: !isSupabaseConfigured,

      signUp: async (name, email, password) => {
        const e = email.trim().toLowerCase();
        if (!name.trim()) return { ok: false, error: "Please enter your name." };
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
          return { ok: false, error: "Enter a valid email address." };
        if (password.length < 8)
          return { ok: false, error: "Password must be at least 8 characters." };
        const sb = getSupabase();
        if (!sb) return NOT_CONFIGURED;
        const { data, error } = await sb.auth.signUp({
          email: e,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) return { ok: false, error: error.message };
        return data.session ? { ok: true } : { ok: true, needsConfirm: true };
      },

      signIn: async (email, password, remember) => {
        const sb = getSupabase();
        if (!sb) return NOT_CONFIGURED;
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          if (/confirm/i.test(error.message))
            return { ok: false, error: "Please confirm your email first — check your inbox." };
          return { ok: false, error: error.message };
        }
        set({ remember });
        return { ok: true };
      },

      signInWithGoogle: async () => {
        const sb = getSupabase();
        if (!sb) return NOT_CONFIGURED;
        const { error } = await sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        return error ? { ok: false, error: error.message } : { ok: true };
      },

      signOut: () => {
        getSupabase()?.auth.signOut().then(undefined, () => {});
        set({ currentUserId: null });
      },

      requestReset: async (email) => {
        const sb = getSupabase();
        if (!sb) return NOT_CONFIGURED;
        const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        return error ? { ok: false, error: error.message } : { ok: true, needsConfirm: true };
      },

      resetPassword: async (newPassword) => {
        if (newPassword.length < 8)
          return { ok: false, error: "Password must be at least 8 characters." };
        const sb = getSupabase();
        if (!sb) return NOT_CONFIGURED;
        const { error } = await sb.auth.updateUser({ password: newPassword });
        return error ? { ok: false, error: error.message } : { ok: true };
      },

      updateProfile: (patch) => {
        const id = get().currentUserId;
        if (!id) return;
        set((s) => ({
          users: { ...s.users, [id]: { ...s.users[id], profile: { ...s.users[id].profile, ...patch } } },
        }));
        syncProfile(id, patch);
      },

      updateSettings: (patch) => {
        const id = get().currentUserId;
        if (!id) return;
        const next = { ...get().users[id].settings, ...patch };
        set((s) => ({ users: { ...s.users, [id]: { ...s.users[id], settings: next } } }));
        syncProfile(id, {}, next);
      },

      changePassword: async (newPassword) => {
        if (newPassword.length < 8)
          return { ok: false, error: "Password must be at least 8 characters." };
        const sb = getSupabase();
        if (!sb) return NOT_CONFIGURED;
        const { error } = await sb.auth.updateUser({ password: newPassword });
        return error ? { ok: false, error: error.message } : { ok: true };
      },

      startCheckout: async (plan) => {
        try {
          const r = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
          });
          const d = await r.json();
          if (!r.ok || !d.url) return { ok: false, error: d.error || "Couldn't start checkout." };
          window.location.href = d.url;
          return { ok: true };
        } catch {
          return { ok: false, error: "Couldn't start checkout." };
        }
      },

      openPortal: async () => {
        try {
          const r = await fetch("/api/billing/portal", { method: "POST" });
          const d = await r.json();
          if (!r.ok || !d.url) return { ok: false, error: d.error || "Couldn't open billing." };
          window.location.href = d.url;
          return { ok: true };
        } catch {
          return { ok: false, error: "Couldn't open billing." };
        }
      },

      redeem: async (codeStr) => {
        const code = codeStr.trim();
        if (!code) return { ok: false, error: "Enter a code." };
        try {
          const r = await fetch("/api/billing/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          const d = await r.json();
          if (!r.ok || !d.ok) return { ok: false, error: d.error || "Invalid code." };
          if (d.plan) get()._setPlanLocal(d.plan);
          return { ok: true };
        } catch {
          return { ok: false, error: "Couldn't redeem that code." };
        }
      },

      deleteAccount: async () => {
        const id = get().currentUserId;
        const sb = getSupabase();
        if (!id || !sb) return;
        await sb.from("workspaces").delete().eq("user_id", id).then(undefined, () => {});
        await sb.from("profiles").delete().eq("id", id).then(undefined, () => {});
        await sb.auth.signOut().then(undefined, () => {});
        set({ currentUserId: null });
      },

      _setSession: (profile, settings) =>
        set((s) => ({
          currentUserId: profile.id,
          users: { ...s.users, [profile.id]: { profile, settings } },
        })),

      _clearSession: () => set({ currentUserId: null }),

      _markResolved: () => set({ sessionResolved: true }),

      _setPlanLocal: (plan) => {
        const id = get().currentUserId;
        if (!id || !get().users[id]) return;
        set((s) => ({
          users: {
            ...s.users,
            [id]: { ...s.users[id], profile: { ...s.users[id].profile, plan } },
          },
        }));
      },
    }),
    {
      name: "anchor-auth",
      // The live Supabase session is the source of truth; only remember the
      // "remember me" preference between loads.
      partialize: (s) => ({ remember: s.remember }),
    }
  )
);

export function useCurrentUser(): UserProfile | null {
  return useAuth((s) => (s.currentUserId ? s.users[s.currentUserId]?.profile ?? null : null));
}

export function useCurrentSettings(): UserSettings | null {
  return useAuth((s) => (s.currentUserId ? s.users[s.currentUserId]?.settings ?? null : null));
}
