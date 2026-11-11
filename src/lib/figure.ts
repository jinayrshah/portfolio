/**
 * The human figure, built in code from simple body shapes and sampled into
 * points. No model file is needed. Units are world units; the figure's centre
 * (0, 0, 0) sits at the chest, with the head near y = 1.15 and feet near -1.9.
 */
type Vec = [number, number, number];
type Part =
  | { kind: "ellipsoid"; centre: Vec; radii: Vec }
  | { kind: "capsule"; from: Vec; to: Vec; radius: number; radiusEnd?: number };

const side = (x: number, parts: (s: number) => Part[]) => [
  ...parts(x),
  ...parts(-x),
];

/** Standing, arms relaxed at the sides. */
export const standing: Part[] = [
  { kind: "ellipsoid", centre: [0, 1.17, 0.01], radii: [0.17, 0.215, 0.19] }, // head
  { kind: "capsule", from: [0, 0.9, 0], to: [0, 1.0, 0], radius: 0.075 }, // neck
  { kind: "ellipsoid", centre: [0, 0.56, 0], radii: [0.31, 0.3, 0.17] }, // chest
  { kind: "ellipsoid", centre: [0, 0.2, 0], radii: [0.25, 0.3, 0.15] }, // waist
  { kind: "ellipsoid", centre: [0, -0.12, 0], radii: [0.28, 0.2, 0.17] }, // hips
  ...(side(1, (s) => [
    {
      kind: "ellipsoid",
      centre: [0.33 * s, 0.76, 0],
      radii: [0.11, 0.1, 0.11],
    }, // shoulder
    {
      kind: "capsule",
      from: [0.38 * s, 0.72, 0],
      to: [0.44 * s, 0.26, -0.01],
      radius: 0.08,
      radiusEnd: 0.065,
    },
    {
      kind: "capsule",
      from: [0.44 * s, 0.26, -0.01],
      to: [0.47 * s, -0.2, 0.05],
      radius: 0.062,
      radiusEnd: 0.045,
    },
    {
      kind: "ellipsoid",
      centre: [0.475 * s, -0.31, 0.06],
      radii: [0.04, 0.095, 0.06],
    }, // hand
    {
      kind: "capsule",
      from: [0.15 * s, -0.2, 0],
      to: [0.17 * s, -1.02, 0.02],
      radius: 0.13,
      radiusEnd: 0.085,
    },
    {
      kind: "capsule",
      from: [0.17 * s, -1.02, 0.02],
      to: [0.17 * s, -1.8, -0.01],
      radius: 0.085,
      radiusEnd: 0.05,
    },
    {
      kind: "ellipsoid",
      centre: [0.17 * s, -1.87, 0.08],
      radii: [0.065, 0.045, 0.15],
    }, // foot
  ]) as Part[]),
];

function volume(p: Part): number {
  if (p.kind === "ellipsoid")
    return (4 / 3) * Math.PI * p.radii[0] * p.radii[1] * p.radii[2];
  const r = (p.radius + (p.radiusEnd ?? p.radius)) / 2;
  const len = Math.hypot(
    p.to[0] - p.from[0],
    p.to[1] - p.from[1],
    p.to[2] - p.from[2],
  );
  return Math.PI * r * r * len + (4 / 3) * Math.PI * r * r * r;
}

/**
 * Fills `out` (xyz per point) with points on and just inside the body's
 * surface. `rand` is a seeded generator so the figure is identical every visit.
 */
export function sampleFigure(
  parts: Part[],
  count: number,
  rand: () => number,
): Float32Array {
  const out = new Float32Array(count * 3);
  // Weight by surface-like measure so thin limbs still get enough points.
  const weights = parts.map((p) => Math.pow(volume(p), 0.72));
  const total = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < count; i++) {
    let pick = rand() * total;
    let part = parts[0];
    for (let k = 0; k < parts.length; k++) {
      pick -= weights[k];
      if (pick <= 0) {
        part = parts[k];
        break;
      }
    }
    // A random direction, and a depth that favours the surface.
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const sq = Math.sqrt(1 - u * u);
    const dx = sq * Math.cos(phi);
    const dy = u;
    const dz = sq * Math.sin(phi);
    const depth = 1 - Math.pow(rand(), 2.2) * 0.55;

    let x: number, y: number, z: number;
    if (part.kind === "ellipsoid") {
      x = part.centre[0] + dx * part.radii[0] * depth;
      y = part.centre[1] + dy * part.radii[1] * depth;
      z = part.centre[2] + dz * part.radii[2] * depth;
    } else {
      const t = rand();
      const r =
        (part.radius + ((part.radiusEnd ?? part.radius) - part.radius) * t) *
        depth;
      x = part.from[0] + (part.to[0] - part.from[0]) * t + dx * r;
      y = part.from[1] + (part.to[1] - part.from[1]) * t + dy * r;
      z = part.from[2] + (part.to[2] - part.from[2]) * t + dz * r;
    }
    // A soft halo: most points hug the body, a few drift just outside it.
    const halo = rand() < 0.14 ? 0.02 + Math.pow(rand(), 2) * 0.16 : 0.008;
    out[i * 3] = x + dx * halo;
    out[i * 3 + 1] = y + dy * halo;
    out[i * 3 + 2] = z + dz * halo;
  }
  return out;
}

/** A small, fast, seeded random generator. */
export function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
