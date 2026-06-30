"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Sparkles, Gift } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { useAuth, useCurrentUser } from "@/store/auth";
import { PLAN_ORDER, PLANS, planRank } from "@/lib/billing/plans";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/cn";

type Me = {
  plan: Plan;
  plan_status: string;
  usage: { used: number; limit: number };
};

export default function PlansPage() {
  const user = useCurrentUser();
  const auth = useAuth();
  const params = useSearchParams();

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);

  const currentPlan = (me?.plan || (user?.plan as Plan) || "free") as Plan;
  const isPaid = currentPlan !== "free";

  // Load plan + usage (authoritative, from the server). Poll briefly after a
  // Stripe return so the just-processed webhook is reflected.
  useEffect(() => {
    let tries = 0;
    const justUpgraded = params.get("upgraded") === "1";
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      try {
        const r = await fetch("/api/billing/me", { cache: "no-store" });
        const d: Me = await r.json();
        setMe(d);
        if (d.plan) auth._setPlanLocal(d.plan);
        if (justUpgraded && d.plan === "free" && tries < 5) {
          tries += 1;
          timer = setTimeout(load, 1500);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    return () => clearTimeout(timer);
  }, [params, auth]);

  useEffect(() => {
    if (params.get("upgraded") === "1")
      setMsg({ ok: true, text: "You're upgraded — enjoy everything. 🎉" });
    else if (params.get("canceled") === "1")
      setMsg({ ok: false, text: "Checkout canceled — no charge was made." });
  }, [params]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 pt-2 text-[13px] font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Account
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Plans &amp; billing</h1>
      <p className="mt-1 text-sm text-ink-muted">
        You&apos;re on the <strong className="capitalize">{currentPlan}</strong> plan.
      </p>

      {me && (
        <GlassCard className="mt-5 p-5">
          <UsageMeter used={me.usage.used} limit={me.usage.limit} />
        </GlassCard>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const current = currentPlan === id;
          const pro = id === "pro";
          const higher = planRank(id) > planRank(currentPlan);

          return (
            <GlassCard
              key={id}
              className={cn("relative flex flex-col p-6", pro && "ring-1 ring-anchor/30")}
            >
              {pro && (
                <span className="absolute -top-2.5 left-6 inline-flex items-center gap-1 rounded-full bg-anchor px-2.5 py-1 text-[11px] font-semibold text-white">
                  <Sparkles size={11} /> Most capable
                </span>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink">{p.label}</h3>
                {current && <Badge tone="green">Current</Badge>}
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{p.price}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.perks.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13.5px] text-ink-soft">
                    <Check size={15} className="mt-0.5 shrink-0 text-anchor" />
                    {f}
                  </li>
                ))}
              </ul>

              {current ? (
                isPaid ? (
                  <Button
                    variant="secondary"
                    className="mt-5 w-full"
                    disabled={busyPlan !== null}
                    onClick={async () => {
                      setBusyPlan(id);
                      const r = await auth.openPortal();
                      if (!r.ok) {
                        setMsg({ ok: false, text: r.error || "Couldn't open billing." });
                        setBusyPlan(null);
                      }
                    }}
                  >
                    Manage billing
                  </Button>
                ) : (
                  <Button variant="secondary" className="mt-5 w-full" disabled>
                    Current plan
                  </Button>
                )
              ) : higher ? (
                <Button
                  variant={pro ? "primary" : "secondary"}
                  className="mt-5 w-full"
                  disabled={busyPlan !== null}
                  onClick={async () => {
                    setBusyPlan(id);
                    const r = await auth.startCheckout(id);
                    if (!r.ok) {
                      setMsg({ ok: false, text: r.error || "Couldn't start checkout." });
                      setBusyPlan(null);
                    }
                  }}
                >
                  {busyPlan === id ? "Starting…" : `Upgrade to ${p.label}`}
                </Button>
              ) : isPaid ? (
                <Button
                  variant="ghost"
                  className="mt-5 w-full"
                  disabled={busyPlan !== null}
                  onClick={async () => {
                    setBusyPlan(id);
                    const r = await auth.openPortal();
                    if (!r.ok) {
                      setMsg({ ok: false, text: r.error || "Couldn't open billing." });
                      setBusyPlan(null);
                    }
                  }}
                >
                  Manage billing
                </Button>
              ) : (
                <span className="mt-5 block h-9" />
              )}
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="mt-5 p-6">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Gift size={17} className="text-anchor" /> Redeem a code
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Have an access code? Enter it to unlock your plan.
        </p>
        <div className="mt-3 flex max-w-sm gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" />
          <Button
            variant="primary"
            onClick={async () => {
              const res = await auth.redeem(code);
              setMsg(
                res.ok
                  ? { ok: true, text: "Unlocked — enjoy everything." }
                  : { ok: false, text: res.error ?? "Invalid code." }
              );
              if (res.ok) setCode("");
            }}
          >
            Redeem
          </Button>
        </div>
        {msg && (
          <p
            className={cn(
              "mt-2 text-[13px] font-medium",
              msg.ok ? "text-emerald-600" : "text-red-600"
            )}
          >
            {msg.text}
          </p>
        )}
      </GlassCard>
    </div>
  );
}
