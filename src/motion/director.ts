import * as THREE from "three";
import { actColour, cameraKeys } from "./timeline";

/**
 * The director turns scroll progress into what the film should show:
 * where the camera wants to be, what it looks at, and the colour of the light.
 */
const positions = new THREE.CatmullRomCurve3(
  cameraKeys.map((k) => new THREE.Vector3(...k.position)),
  false,
  "centripetal",
);
const targets = new THREE.CatmullRomCurve3(
  cameraKeys.map((k) => new THREE.Vector3(...k.target)),
  false,
  "centripetal",
);

/** Converts progress into the curve parameter, honouring each key's `at`. */
function curveParam(progress: number): { u: number; i: number; t: number } {
  const p = Math.min(1, Math.max(0, progress));
  const last = cameraKeys.length - 1;
  let i = 0;
  while (i < last - 1 && p > cameraKeys[i + 1].at) i++;
  const a = cameraKeys[i].at;
  const b = cameraKeys[i + 1].at;
  const t = b > a ? (p - a) / (b - a) : 0;
  return { u: (i + t) / last, i, t };
}

export function cameraGoal(
  progress: number,
  outPosition: THREE.Vector3,
  outTarget: THREE.Vector3,
): number {
  const { u, i, t } = curveParam(progress);
  positions.getPoint(u, outPosition);
  targets.getPoint(u, outTarget);
  const s = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(cameraKeys[i].fov, cameraKeys[i + 1].fov, s);
}

const soul = new THREE.Color(actColour.soul);
const mind = new THREE.Color(actColour.mind);
const creation = new THREE.Color(actColour.creation);

/** Silver-blue, then violet, then gold, blending across the act changes. */
export function lightColour(progress: number, out: THREE.Color): THREE.Color {
  const toMind = THREE.MathUtils.smoothstep(progress, 0.3, 0.4);
  const toCreation = THREE.MathUtils.smoothstep(progress, 0.52, 0.64);
  return out.copy(soul).lerp(mind, toMind).lerp(creation, toCreation);
}
