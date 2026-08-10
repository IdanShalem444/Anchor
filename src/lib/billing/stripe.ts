import Stripe from "stripe";
import type { Plan } from "@/lib/types";

// Server-only Stripe helper. Null when STRIPE_SECRET_KEY isn't set, so the app
// still builds/runs without billing configured.

const key = process.env.STRIPE_SECRET_KEY;
export const isStripeConfigured = !!key;

let _stripe: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}

/** Paid plan → Stripe Price ID (from env). */
export function priceForPlan(plan: Plan): string | null {
  if (plan === "basic") return process.env.STRIPE_PRICE_BASIC || null;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO || null;
  return null;
}

/** Stripe Price ID → plan. */
export function planForPrice(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_BASIC) return "basic";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return null;
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
