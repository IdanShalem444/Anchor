"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Zap } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { EntitlementBlock } from "@/lib/billing/signals";
import { FEATURE_LABELS, planDef, type Feature } from "@/lib/billing/plans";
import type { Plan } from "@/lib/types";

export function UpgradeModal({
  block,
  onClose,
}: {
  block: EntitlementBlock | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const open = !!block;

  const feature = block?.kind === "feature_locked" ? (block.feature as Feature) : null;
  const required = (
    block?.kind === "feature_locked" || block?.kind === "limit" ? block.requiredPlan : "pro"
  ) as Plan;
  const reqDef = planDef(required);

  const title =
    block?.kind === "ai_limit"
      ? "You've hit your monthly limit"
      : block?.kind === "limit"
      ? block.title
      : "Upgrade to unlock this";
  const description =
    block?.kind === "ai_limit"
      ? `You've used all ${block.limit} AI generations on the ${planDef(
          block.plan as Plan
        ).label} plan this month. Upgrade for more — or it resets at the start of next month.`
      : block?.kind === "limit"
      ? block.description
      : feature
      ? `${FEATURE_LABELS[feature]} is part of ${reqDef.label}. Upgrade to start using it.`
      : "This feature needs a higher plan.";

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="space-y-4">
        <div className="rounded-2xl bg-anchor/[0.07] p-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Sparkles size={16} className="text-anchor" /> {reqDef.label} — {reqDef.price}
          </div>
          <ul className="mt-2 space-y-1">
            {reqDef.perks.slice(0, 4).map((p) => (
              <li key={p} className="flex items-start gap-2 text-[13px] text-ink-soft">
                <Zap size={13} className="mt-0.5 shrink-0 text-anchor" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              router.push("/account/plans");
            }}
          >
            See plans
          </Button>
        </div>
      </div>
    </Modal>
  );
}
