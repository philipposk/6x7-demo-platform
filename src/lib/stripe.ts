import Stripe from "stripe";

// Server-side Stripe client. STRIPE_SECRET_KEY is server-only (never NEXT_PUBLIC).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Price IDs created in the Stripe dashboard (test + live). Plan → price.
export const PRICE = {
  demo: process.env.STRIPE_PRICE_DEMO || "",     // demo.6x7.gr only
  global: process.env.STRIPE_PRICE_GLOBAL || "", // all 6x7 apps
} as const;

export type Plan = keyof typeof PRICE;
