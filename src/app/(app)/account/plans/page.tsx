"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Gift } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth, useCurrentUser } from "@/store/auth";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/cn";

const PLANS: { id: Plan; name: string; price: string; features: string[] }[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    features: ["Up to 3 subjects", "Limited AI generations", "Flashcards & tests", "Personal notes & reminders"],
  },
  {
    id: "basic",
    name: "Basic",
    price: "$6/mo",
    features: ["Up to 10 subjects", "More AI generations", "All study tools", "Projects & planning"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12/mo",
    features: ["Unlimited subjects", "Unlimited AI", "Unlimited storage", "Every feature, first"],
  },
];

export default function PlansPage() {
  const user = useCurrentUser();
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24">
      <Link href="/account" className="inline-flex items-center gap-1.5 pt-2 text-[13px] font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Account
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Plans & billing</h1>
      <p className="mt-1 text-sm text-ink-muted">Choose the plan that fits. You&apos;re on the <strong className="capitalize">{user.plan}</strong> plan.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const current = user.plan === p.id;
          const pro = p.id === "pro";
          return (
            <GlassCard
              key={p.id}
              className={cn("relative flex flex-col p-6", pro && "ring-1 ring-anchor/30")}
            >
              {pro && (
                <span className="absolute -top-2.5 left-6 inline-flex items-center gap-1 rounded-full bg-anchor px-2.5 py-1 text-[11px] font-semibold text-white">
                  <Sparkles size={11} /> Most capable
                </span>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
                {current && <Badge tone="green">Current</Badge>}
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{p.price}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13.5px] text-ink-soft">
                    <Check size={15} className="mt-0.5 shrink-0 text-anchor" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={current ? "secondary" : pro ? "primary" : "secondary"}
                className="mt-5 w-full"
                disabled={current}
                onClick={() => auth.setPlan(p.id)}
              >
                {current ? "Current plan" : `Switch to ${p.name}`}
              </Button>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="mt-5 p-6">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Gift size={17} className="text-anchor" /> Redeem a code
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">Have an access code? Enter it to unlock your plan.</p>
        <div className="mt-3 flex max-w-sm gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" />
          <Button
            variant="primary"
            onClick={async () => {
              const res = await auth.redeem(code);
              setMsg(res.ok ? { ok: true, text: "Pro unlocked. Enjoy everything." } : { ok: false, text: res.error ?? "Invalid code." });
              if (res.ok) setCode("");
            }}
          >
            Redeem
          </Button>
        </div>
        {msg && (
          <p className={cn("mt-2 text-[13px] font-medium", msg.ok ? "text-emerald-600" : "text-red-600")}>
            {msg.text}
          </p>
        )}
      </GlassCard>
    </div>
  );
}
