// One-shot Stripe setup for Anchor.
// Creates the Basic + Pro products/prices and the billing webhook, then writes
// the resulting IDs into .env.local. Safe to re-run (it reuses what exists).
//
// Run once from the project root:
//   STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe.mjs
//
// Optional: point at a different deployed URL (defaults to the Vercel site):
//   STRIPE_SECRET_KEY=sk_test_xxx APP_URL=https://your-app node scripts/setup-stripe.mjs

import Stripe from "stripe";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Read a value from .env.local as a fallback, so you can paste the key into the
// file instead of passing it on the command line.
function fromEnvLocal(name) {
  if (!existsSync(".env.local")) return undefined;
  const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
}

const key = process.env.STRIPE_SECRET_KEY || fromEnvLocal("STRIPE_SECRET_KEY");
if (!key) {
  console.error(
    "✗ No Stripe key found.\n" +
      "  Either add a line to .env.local:  STRIPE_SECRET_KEY=sk_test_xxx\n" +
      "  then run:  node scripts/setup-stripe.mjs"
  );
  process.exit(1);
}

const appUrl = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  fromEnvLocal("NEXT_PUBLIC_APP_URL") ||
  "https://anchor-seven-lyart.vercel.app"
).replace(/\/$/, "");

const stripe = new Stripe(key);
const live = key.startsWith("sk_live");

const PLANS = [
  { name: "Anchor Basic", lookup: "anchor_basic", amount: 600 }, // $6.00 / month
  { name: "Anchor Pro", lookup: "anchor_pro", amount: 1200 }, // $12.00 / month
];

// Reuse a price by its lookup_key if it already exists, else create product+price.
async function ensurePrice(p) {
  const existing = await stripe.prices.list({ lookup_keys: [p.lookup], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const product = await stripe.products.create({ name: p.name });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: p.amount,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: p.lookup,
  });
  return price.id;
}

async function ensureWebhook() {
  const url = `${appUrl}/api/billing/webhook`;
  const events = [
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];
  const list = await stripe.webhookEndpoints.list({ limit: 100 });
  const found = list.data.find((w) => w.url === url);
  if (found) return { id: found.id, secret: null }; // secret only returned at create time
  const wh = await stripe.webhookEndpoints.create({ url, enabled_events: events });
  return { id: wh.id, secret: wh.secret };
}

function upsertEnv(values) {
  const path = ".env.local";
  let env = existsSync(path) ? readFileSync(path, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    if (v == null) continue;
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(env)) env = env.replace(re, `${k}=${v}`);
    else env += (env === "" || env.endsWith("\n") ? "" : "\n") + `${k}=${v}\n`;
  }
  writeFileSync(path, env);
}

console.log(`→ Using ${live ? "LIVE" : "TEST"} key, app URL ${appUrl}\n`);

const basic = await ensurePrice(PLANS[0]);
const pro = await ensurePrice(PLANS[1]);
const wh = await ensureWebhook();

upsertEnv({
  STRIPE_SECRET_KEY: key,
  STRIPE_PRICE_BASIC: basic,
  STRIPE_PRICE_PRO: pro,
  NEXT_PUBLIC_APP_URL: appUrl,
  STRIPE_WEBHOOK_SECRET: wh.secret, // null if the webhook already existed (skipped)
});

console.log("✅ Stripe configured and written to .env.local:");
console.log(`   STRIPE_PRICE_BASIC   = ${basic}`);
console.log(`   STRIPE_PRICE_PRO     = ${pro}`);
console.log(`   webhook endpoint     = ${wh.id}`);
console.log(
  wh.secret
    ? "   STRIPE_WEBHOOK_SECRET written ✓"
    : "   (Webhook already existed — copy its signing secret from Stripe → Developers → Webhooks)"
);
console.log(
  "\nNext: copy these same vars (plus SUPABASE_SERVICE_ROLE_KEY) into\n" +
    "Vercel → Settings → Environment Variables, then redeploy."
);
