"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { AnchorMark } from "@/components/brand/AnchorLogo";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAuth } from "@/store/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const resetPassword = useAuth((s) => s.resetPassword);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await resetPassword(pw);
    setBusy(false);
    if (res.ok) {
      setMsg("Password updated. Redirecting…");
      setTimeout(() => router.replace("/dashboard"), 800);
    } else {
      setMsg(res.error ?? "Could not reset password.");
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="glass-strong w-full max-w-sm rounded-4xl p-7 shadow-glass">
        <AnchorMark size={32} />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          Set a new password
        </h1>
        {!isSupabaseConfigured ? (
          <>
            <p className="mt-2 text-sm text-ink-muted">
              Password reset links are available once cloud accounts are enabled.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-anchor hover:underline">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-muted">Choose a new password for your account.</p>
            <div className="mt-5">
              <Label>New password</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <Input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="At least 8 characters"
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
            </div>
            {msg && <p className="mt-3 text-[13px] font-medium text-anchor-700">{msg}</p>}
            <Button variant="primary" size="lg" className="mt-5 w-full" disabled={busy} onClick={submit}>
              Update password <ArrowRight size={17} />
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
