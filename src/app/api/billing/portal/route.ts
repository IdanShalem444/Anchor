import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getStripe, appUrl } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe billing portal — manage / cancel a subscription.
export async function POST() {
  const stripe = getStripe();
  if (!stripe)
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: "Accounts not configured" }, { status: 400 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const { data: prof } = await sb
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof?.stripe_customer_id)
    return NextResponse.json({ error: "No billing account yet." }, { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer: prof.stripe_customer_id,
    return_url: `${appUrl()}/account/plans`,
  });

  return NextResponse.json({ url: session.url });
}
