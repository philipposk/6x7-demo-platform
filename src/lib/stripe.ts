import Stripe from "stripe";

// Server-side Stripe client. STRIPE_SECRET_KEY is server-only (never NEXT_PUBLIC).
// Created on first use so a missing key fails the request, not `next build`.
let _stripe: Stripe | undefined;
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return (_stripe ??= new Stripe(key));
}

// Price IDs created in the Stripe dashboard (test + live). Plan → price.
export const PRICE = {
  demo: process.env.STRIPE_PRICE_DEMO || "",     // demo.6x7.gr only
  global: process.env.STRIPE_PRICE_GLOBAL || "", // all 6x7 apps
} as const;

export type Plan = keyof typeof PRICE;
