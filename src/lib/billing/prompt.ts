"use client";

import { emitBlock } from "./signals";
import { PLAN_ORDER, planDef, requiredPlanFor, type Feature } from "./plans";
import type { Plan } from "@/lib/types";

/** Show the upgrade modal for a locked feature (client-side gate). */
export function promptFeature(feature: Feature, plan: Plan): void {
  emitBlock({ kind: "feature_locked", feature, requiredPlan: requiredPlanFor(feature), plan });
}

/** Show the upgrade modal when the subject cap is reached. */
export function promptSubjectLimit(plan: Plan): void {
  const next = PLAN_ORDER[Math.min(PLAN_ORDER.length - 1, PLAN_ORDER.indexOf(plan) + 1)] as Plan;
  emitBlock({
    kind: "limit",
    title: "Subject limit reached",
    description: `Your ${planDef(plan).label} plan includes ${planDef(plan).subjects} subjects. Upgrade to add more.`,
    requiredPlan: next,
  });
}
