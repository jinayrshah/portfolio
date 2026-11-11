import type { Tier } from "./store";

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** A cheap, free estimate of what the device can render smoothly. */
export function detectTier(): Tier {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (coarse || cores <= 4 || memory <= 4)
    return coarse && cores <= 4 ? "low" : "mid";
  return "high";
}

export const tierSettings = {
  high: { dust: 9000, dpr: 2 },
  mid: { dust: 5000, dpr: 1.5 },
  low: { dust: 2200, dpr: 1 },
} as const;
