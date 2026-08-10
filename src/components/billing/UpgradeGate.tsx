"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { FEATURE_LABELS, planDef, requiredPlanFor, type Feature } from "@/lib/billing/plans";

/** Full-panel lock shown in place of a feature that the current plan can't use. */
export function UpgradeGate({
  feature,
  title,
  description,
}: {
  feature: Feature;
  title?: string;
  description?: string;
}) {
  const req = planDef(requiredPlanFor(feature));
  return (
    <GlassCard className="mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-anchor/10">
        <Lock size={22} className="text-anchor" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-ink">
        {title || `${FEATURE_LABELS[feature]} is a ${req.label} feature`}
      </h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        {description || `Upgrade to ${req.label} to unlock ${FEATURE_LABELS[feature]} and more.`}
      </p>
      <Link href="/account/plans" className="mt-5 inline-block">
        <Button variant="primary">
          <Sparkles size={15} /> See plans
        </Button>
      </Link>
    </GlassCard>
  );
}
