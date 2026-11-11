/**
 * Critically damped spring ("smooth damp"). Moves `current` toward `target`
 * with weight and no overshoot oscillation, independent of frame rate.
 * `state.v` carries the velocity between frames.
 */
export type SpringState = { v: number };

export function smoothDamp(
  current: number,
  target: number,
  state: SpringState,
  smoothTime: number,
  dt: number,
): number {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (state.v + omega * change) * dt;
  state.v = (state.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}
