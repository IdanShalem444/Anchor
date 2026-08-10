import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getStripe, priceForPlan, appUrl } from "@/lib/billing/stripe";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe)
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Accounts not configured" }, { status: 400 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  let plan: Plan = "pro";
  try {
    const body = await req.json();
    if (body?.plan === "basic" || body?.plan === "pro") plan = body.plan;
  } catch {
    /* default pro */
  }

  const price = priceForPlan(plan);
  if (!price)
    return NextResponse.json({ error: "That plan isn't available." }, { status: 400 });

  const { data: prof } = await sb
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .maybeSingle();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer: prof?.stripe_customer_id || undefined,
    customer_email: prof?.stripe_customer_id ? undefined : user.email || prof?.email || undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    subscription_data: { metadata: { user_id: user.id, plan } },
    success_url: `${appUrl()}/account/plans?upgraded=1`,
    cancel_url: `${appUrl()}/account/plans?canceled=1`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
