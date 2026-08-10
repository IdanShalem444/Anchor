"use client";

import { useCurrentUser } from "@/store/auth";
import { can, planDef, subjectLimit, type Feature } from "./plans";
import type { Plan } from "@/lib/types";

/** Client-side entitlement check, read from the current user's plan. */
export function useEntitlements() {
  const user = useCurrentUser();
  const plan = ((user?.plan as Plan) || "free") as Plan;
  return {
    plan,
    def: planDef(plan),
    can: (f: Feature) => can(plan, f),
    subjectLimit: subjectLimit(plan),
    isFree: plan === "free",
  };
}
