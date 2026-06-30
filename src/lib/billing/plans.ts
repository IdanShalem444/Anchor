import type { Plan } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Plans & entitlements — the single source of truth for what each
// tier unlocks. Pure data (no secrets, no env), safe to import on
// BOTH the client (UI gating) and the server (enforcement).
// ─────────────────────────────────────────────────────────────

export type Feature = "noteImprover" | "canvas" | "projects" | "bestModel";

export interface PlanDef {
  id: Plan;
  label: string;
  price: string;
  /** Monthly pooled AI-generation cap (analyze/flashcards/test/chat/improve each = 1). */
  aiLimit: number;
  /** Max active subjects (Infinity = unlimited). */
  subjects: number;
  features: Record<Feature, boolean>;
  /** Marketing bullet points for the plans page. */
  perks: string[];
}

export const PLANS: Record<Plan, PlanDef> = {
  free: {
    id: "free",
    label: "Free",
    price: "$0",
    aiLimit: 15,
    subjects: 3,
    features: { noteImprover: false, canvas: false, projects: false, bestModel: false },
    perks: [
      "15 AI generations / month",
      "Up to 3 subjects",
      "Flashcards, tests & AI tutor",
      "Personal notes & reminders",
    ],
  },
  basic: {
    id: "basic",
    label: "Basic",
    price: "$6/mo",
    aiLimit: 150,
    subjects: 10,
    features: { noteImprover: true, canvas: true, projects: true, bestModel: false },
    perks: [
      "150 AI generations / month",
      "Up to 10 subjects",
      "AI note improver",
      "Canvas auto-sync",
      "Projects & planning",
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    price: "$12/mo",
    aiLimit: 1000,
    subjects: Infinity,
    features: { noteImprover: true, canvas: true, projects: true, bestModel: true },
    perks: [
      "1,000 AI generations / month",
      "Unlimited subjects",
      "Smartest AI model (best study guides)",
      "Everything in Basic",
      "Early access to new features",
    ],
  },
};

export const PLAN_ORDER: Plan[] = ["free", "basic", "pro"];

export function planDef(plan: Plan | undefined | null): PlanDef {
  return PLANS[(plan as Plan) ?? "free"] ?? PLANS.free;
}
export function aiLimit(plan: Plan): number {
  return planDef(plan).aiLimit;
}
export function subjectLimit(plan: Plan): number {
  return planDef(plan).subjects;
}
export function can(plan: Plan, feature: Feature): boolean {
  return planDef(plan).features[feature];
}

/** The cheapest plan that unlocks a feature — for "Upgrade to X" copy. */
export function requiredPlanFor(feature: Feature): Plan {
  for (const p of PLAN_ORDER) if (can(p, feature)) return p;
  return "pro";
}

export function planRank(plan: Plan): number {
  const i = PLAN_ORDER.indexOf(plan);
  return i < 0 ? 0 : i;
}

/** Human label for a feature, used in upgrade prompts. */
export const FEATURE_LABELS: Record<Feature, string> = {
  noteImprover: "AI Note Improver",
  canvas: "Canvas auto-sync",
  projects: "Projects & planning",
  bestModel: "the smartest AI model",
};
