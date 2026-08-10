import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planForPrice } from "@/lib/billing/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe → us. The ONLY trusted way a paid plan is granted: the webhook writes
// the plan with the service-role client (which the plan-lock trigger allows).
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = getSupabaseAdmin();
  if (!stripe || !secret || !admin)
    return NextResponse.json({ error: "billing not configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig || "", secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const setPlan = async (
    userId: string,
    plan: Plan,
    status: string,
    sub?: Stripe.Subscription,
    customerId?: string
  ) => {
    const patch: Record<string, unknown> = { plan, plan_status: status };
    if (customerId) patch.stripe_customer_id = customerId;
    if (sub) {
      patch.stripe_subscription_id = sub.id;
      const ends = (sub as unknown as { current_period_end?: number }).current_period_end;
      patch.plan_renews_at = ends ? new Date(ends * 1000).toISOString() : null;
    }
    await admin.from("profiles").update(patch).eq("id", userId);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id || s.metadata?.user_id;
        if (userId) {
          const sub =
            typeof s.subscription === "string"
              ? await stripe.subscriptions.retrieve(s.subscription)
              : null;
          const priceId = sub?.items?.data?.[0]?.price?.id;
          const plan = planForPrice(priceId) || ((s.metadata?.plan as Plan) ?? "pro");
          await setPlan(userId, plan, "active", sub ?? undefined, (s.customer as string) || undefined);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const plan = planForPrice(sub.items?.data?.[0]?.price?.id) || (sub.metadata?.plan as Plan);
        if (userId && plan) {
          // Keep access while active/trialing/past_due (grace for retries);
          // drop to free for canceled/unpaid/expired.
          const keep = ["active", "trialing", "past_due"].includes(sub.status);
          await setPlan(userId, keep ? plan : "free", sub.status, sub, sub.customer as string);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (userId) await setPlan(userId, "free", "canceled", sub, sub.customer as string);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[billing] webhook handler error:", e);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
