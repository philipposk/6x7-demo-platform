import type { RenderOptions } from "./options";

// Rough cost of a single render to us, then a customer price. The hard ceiling
// from the project brief is $0.30/video; we keep prices well under that.
//
// Voice cost is per ~1300-char narration (a typical 90-120s video).
const VOICE_COST_USD: Record<string, number> = {
  edge: 0,
  kokoro: 0,
  openai: 0.03, // gpt-4o-mini-tts
  elevenlabs: 0.12,
};

// Flat infra cost per render (worker minutes on the VM). Conservative.
const INFRA_COST_USD = 0.02;

export type Quote = {
  costUsd: number; // what the render costs us
  priceUsd: number; // what we charge
  free: boolean;
  breakdown: { label: string; usd: number }[];
};

export function quote(o: Pick<RenderOptions, "service" | "voice">): Quote {
  if (o.service === "screenshots") {
    return {
      costUsd: 0,
      priceUsd: 0,
      free: true,
      breakdown: [{ label: "Screenshot grid (Playwright only)", usd: 0 }],
    };
  }

  const voiceCost = VOICE_COST_USD[o.voice] ?? 0;
  const costUsd = +(voiceCost + INFRA_COST_USD).toFixed(3);

  // Price model: free for the free voices, otherwise a small flat price that
  // covers cost with margin and stays under the $0.30 ceiling.
  const priceUsd =
    voiceCost === 0 ? 0 : Math.min(0.29, Math.max(0.1, +(costUsd * 2.2).toFixed(2)));

  return {
    costUsd,
    priceUsd,
    free: priceUsd === 0,
    breakdown: [
      { label: `Voice (${o.voice})`, usd: voiceCost },
      { label: "Render / infra", usd: INFRA_COST_USD },
    ],
  };
}

export const fmtUsd = (n: number) => (n === 0 ? "Free" : `$${n.toFixed(2)}`);
