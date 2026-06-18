"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAuth } from "@/store/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "reset";

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7C43.9 38 46.5 31.8 46.5 24.5z" />
      <path fill="#FBBC05" d="M10.4 28.3c-.5-1.4-.8-3-.8-4.3s.3-2.9.8-4.3l-7.8-6.1C.9 16.7 0 20.2 0 24s.9 7.3 2.6 10.4l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.3-5.7c-2 1.4-4.7 2.3-7.9 2.3-6.3 0-11.7-3.8-13.6-9.3l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function AuthCard({ initialMode = "signin" }: { initialMode?: Mode }) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pwChecks = [
    { ok: password.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Za-z]/.test(password), label: "Contains a letter" },
    { ok: /\d/.test(password), label: "Contains a number" },
  ];

  if (!isSupabaseConfigured) {
    return (
      <div className="glass-strong w-full rounded-4xl p-7 shadow-glass">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-anchor/10">
          <KeyRound className="text-anchor" size={20} />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          Connect your backend
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Anchor needs a Supabase project to create real accounts that sync across
          your devices. Add these to <code className="rounded bg-black/[0.05] px-1 py-0.5">.env.local</code> and restart:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/[0.04] px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
{`NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…`}
        </pre>
        <p className="mt-3 text-[13px] text-ink-faint">
          See README.md for the full setup (run <code className="rounded bg-black/[0.05] px-1 py-0.5">supabase/schema.sql</code>, OpenRouter key, deploy).
        </p>
      </div>
    );
  }

  async function handleSignin() {
    setError(null);
    setInfo(null);
    setBusy(true);
    const res = await auth.signIn(email, password, remember);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Could not sign in.");
    // success: the session bridge sets the user and the landing page redirects.
  }

  async function handleSignup() {
    setError(null);
    setInfo(null);
    setBusy(true);
    const res = await auth.signUp(name, email, password);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Could not create account.");
    if (res.needsConfirm) {
      setInfo("Account created. Check your email to confirm it, then sign in.");
      setMode("signin");
    }
    // otherwise signed in immediately; bridge + landing handle the redirect.
  }

  async function handleReset() {
    setError(null);
    setInfo(null);
    setBusy(true);
    const res = await auth.requestReset(email);
    setBusy(false);
    if (res.ok) setInfo("We've emailed you a reset link — follow it to set a new password.");
    else setError(res.error ?? "Could not start reset.");
  }

  const submit =
    mode === "signin" ? handleSignin : mode === "signup" ? handleSignup : handleReset;

  const titles: Record<Mode, { h: string; s: string }> = {
    signin: { h: "Welcome back", s: "Sign in to your anchored workspace." },
    signup: { h: "Create your account", s: "A profile and workspace are set up instantly." },
    reset: { h: "Reset password", s: "Enter your email and we'll send a reset link." },
  };

  return (
    <div className="glass-strong w-full rounded-4xl p-7 shadow-glass">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{titles[mode].h}</h2>
          <p className="mt-1 text-sm text-ink-muted">{titles[mode].s}</p>

          <div className="mt-5 space-y-3.5">
            {mode === "signup" && (
              <Field icon={UserIcon} placeholder="Full name" value={name} onChange={setName} onEnter={submit} />
            )}

            <Field
              icon={Mail}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={setEmail}
              onEnter={submit}
            />

            {(mode === "signin" || mode === "signup") && (
              <div className="relative">
                <Field
                  icon={Lock}
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={setPassword}
                  onEnter={submit}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink-soft"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            {mode === "signup" && password.length > 0 && (
              <ul className="space-y-1 pt-0.5">
                {pwChecks.map((c) => (
                  <li
                    key={c.label}
                    className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-emerald-600" : "text-ink-faint"}`}
                  >
                    <Check size={13} strokeWidth={c.ok ? 3 : 2} />
                    {c.label}
                  </li>
                ))}
              </ul>
            )}

            {mode === "signin" && (
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded-md accent-anchor"
                  />
                  Remember me
                </label>
                <button
                  onClick={() => {
                    setMode("reset");
                    setError(null);
                    setInfo(null);
                  }}
                  className="text-[13px] font-medium text-anchor hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="text-[13px] font-medium text-red-600">{error}</p>}
            {info && <p className="text-[13px] font-medium text-emerald-600">{info}</p>}

            <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={submit}>
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Email reset link"}
              <ArrowRight size={17} />
            </Button>

            {(mode === "signin" || mode === "signup") && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-black/[0.07]" />
                  <span className="text-xs text-ink-faint">or</span>
                  <div className="h-px flex-1 bg-black/[0.07]" />
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  onClick={async () => {
                    setError(null);
                    const res = await auth.signInWithGoogle();
                    if (!res.ok) setError(res.error ?? "Google sign-in failed.");
                    // success redirects to Google, then back via /auth/callback
                  }}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </>
            )}
          </div>

          <div className="mt-5 text-center text-[13.5px] text-ink-muted">
            {mode === "signin" && (
              <>
                New to Anchor?{" "}
                <button
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setInfo(null);
                  }}
                  className="font-semibold text-anchor hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setInfo(null);
                  }}
                  className="font-semibold text-anchor hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === "reset" && (
              <button
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setInfo(null);
                }}
                className="font-semibold text-anchor hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Field({
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  onEnter,
}: {
  icon: typeof Mail;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
}) {
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        className="pl-10"
      />
    </div>
  );
}
