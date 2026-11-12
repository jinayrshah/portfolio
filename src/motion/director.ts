import * as THREE from "three";
import {
  actColour,
  cameraKeys,
  figureKeys,
  soul as soulFigure,
} from "./timeline";

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

/**
 * Where the soul actually is this frame. It follows its scripted height with
 * the same weight as the camera, so a fast scroll never leaves it behind or
 * lets it escape the frame. Written by the soul, read by the light at its heart.
 */
export const figureNow = { y: 0, ready: false };

/** Height of the soul's centre at this point in the scroll. */
export function figureHeight(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  let i = 0;
  while (i < figureKeys.length - 2 && p > figureKeys[i + 1].at) i++;
  const a = figureKeys[i];
  const b = figureKeys[i + 1];
  const t =
    b.at > a.at ? Math.min(1, Math.max(0, (p - a.at) / (b.at - a.at))) : 0;
  // Ease in and out so the rise accelerates and settles naturally.
  const s = t * t * t * (t * (t * 6 - 15) + 10);
  return a.y + (b.y - a.y) * s;
}

/**
 * How far right of centre the soul's heart sits. On wide screens it opens
 * beside the name and returns to the centre as it rises; on tall screens it
 * stays centred on the picture.
 */
export function figureOffsetX(progress: number, aspect: number): number {
  const wide = THREE.MathUtils.smoothstep(aspect, 0.9, 1.3);
  const halfWidth = 2.45 * Math.min(aspect, 2.2);
  const opening = THREE.MathUtils.lerp(
    0.47,
    soulFigure.openingShift * halfWidth,
    wide,
  );
  return opening * (1 - THREE.MathUtils.smoothstep(progress, 0.08, 0.2));
}
