/**
 * The master timeline. Every scene length, camera keyframe, easing and
 * duration on the site is defined here, by name, so motion can be retimed by
 * editing numbers in this one file.
 *
 * Progress runs from 0 (top of the page) to 1 (bottom).
 */

/** How many screen-heights of scrolling the whole film takes. */
export const SCROLL_SCREENS = 6;

export type Act = "soul" | "mind" | "creation";

export const scenes = [
  {
    id: "genesis",
    name: "Genesis",
    act: "soul",
    start: 0.0,
    end: 0.08,
    spine: true,
  },
  {
    id: "ascent",
    name: "Ascent",
    act: "soul",
    start: 0.08,
    end: 0.2,
    spine: true,
  },
  {
    id: "stillness",
    name: "Stillness",
    act: "soul",
    start: 0.2,
    end: 0.34,
    spine: true,
  },
  {
    id: "awakening",
    name: "Awakening",
    act: "mind",
    start: 0.34,
    end: 0.5,
    spine: true,
  },
  {
    id: "intention",
    name: "Intention",
    act: "mind",
    start: 0.5,
    end: 0.6,
    spine: false,
  },
  {
    id: "beam",
    name: "Beam",
    act: "creation",
    start: 0.6,
    end: 0.7,
    spine: true,
  },
  {
    id: "bloom",
    name: "Bloom",
    act: "creation",
    start: 0.7,
    end: 0.8,
    spine: true,
  },
  {
    id: "constellation",
    name: "Constellation",
    act: "creation",
    start: 0.8,
    end: 0.95,
    spine: true,
  },
  {
    id: "return",
    name: "Return",
    act: "creation",
    start: 0.95,
    end: 1.0,
    spine: false,
  },
] as const satisfies readonly {
  id: string;
  name: string;
  act: Act;
  start: number;
  end: number;
  /** Whether the scene has a light on the navigation spine (seven in total). */
  spine: boolean;
}[];

export type Scene = (typeof scenes)[number];
export type SceneId = Scene["id"];

export function sceneIndexAt(progress: number): number {
  for (let i = scenes.length - 1; i >= 0; i--) {
    if (progress >= scenes[i].start) return i;
  }
  return 0;
}

/** How far through its own range a scene is, clamped to 0..1. */
export function sceneProgress(id: SceneId, progress: number): number {
  const s = scenes.find((x) => x.id === id)!;
  return Math.min(1, Math.max(0, (progress - s.start) / (s.end - s.start)));
}

/**
 * Camera keyframes. The camera wants to be at `position`, looking at `target`,
 * with field of view `fov`, when scroll progress equals `at`. Between
 * keyframes it follows a smooth curve; a spring then gives it weight.
 * After the soul scenes, `target` is also the path of the light the visitor follows.
 */
export type CameraKey = {
  name: string;
  at: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export const cameraKeys: CameraKey[] = [
  {
    name: "genesis-wide",
    at: 0.0,
    position: [0, -1.5, 10],
    target: [0, -1.75, 0],
    fov: 38,
  },
  {
    name: "genesis-close",
    at: 0.08,
    position: [0, -1.0, 7.6],
    target: [0, -1.2, 0],
    fov: 38,
  },
  {
    name: "ascent-arrive",
    at: 0.2,
    position: [0, 36.5, 9],
    target: [0, 40, 0],
    fov: 46,
  },
  {
    name: "stillness-orbit",
    at: 0.27,
    position: [7, 40.5, 5],
    target: [0, 40, 0],
    fov: 36,
  },
  {
    name: "stillness-front",
    at: 0.34,
    position: [0, 40.6, 6],
    target: [0, 40.9, 0],
    fov: 34,
  },
  {
    name: "awakening-enter",
    at: 0.42,
    position: [0, 41.1, 0.9],
    target: [0, 41.15, 0],
    fov: 58,
  },
  {
    name: "awakening-inside",
    at: 0.5,
    position: [0.3, 41.2, 0.25],
    target: [0, 41.1, -0.6],
    fov: 50,
  },
  {
    name: "intention-heart",
    at: 0.6,
    position: [0.2, 40.5, 1.2],
    target: [0, 40.35, 0],
    fov: 44,
  },
  {
    name: "beam-ride",
    at: 0.65,
    position: [14, 39, -8],
    target: [26, 38.5, -22],
    fov: 60,
  },
  {
    name: "beam-arrive",
    at: 0.7,
    position: [40, 37, -44],
    target: [56, 37, -70],
    fov: 56,
  },
  {
    name: "bloom-roots",
    at: 0.74,
    position: [54, 31, -62],
    target: [60, 36, -80],
    fov: 44,
  },
  {
    name: "bloom-canopy",
    at: 0.8,
    position: [56, 48, -66],
    target: [60, 50, -80],
    fov: 42,
  },
  {
    name: "constellation-wide",
    at: 0.95,
    position: [48, 52, -44],
    target: [60, 50, -80],
    fov: 40,
  },
  {
    name: "return-rest",
    at: 1.0,
    position: [44, 53, -30],
    target: [60, 50, -80],
    fov: 36,
  },
];

/** How the physical camera behaves. Higher smoothTime = heavier camera. */
export const cameraFeel = {
  positionSmoothTime: 0.55,
  targetSmoothTime: 0.4,
  fovSmoothTime: 0.6,
  /** Extra field of view per unit of speed, and its cap, in degrees. */
  speedFov: 0.35,
  speedFovMax: 9,
  /** Roll into curves: radians per unit of sideways speed, and its cap. */
  bank: 0.012,
  bankMax: 0.14,
  /** Handheld breath: amplitude in world units and cycles per second. */
  breathAmplitude: 0.035,
  breathSpeed: 0.11,
  /** Cursor parallax: how far the camera shifts, in world units. */
  parallax: 0.22,
  parallaxSmoothTime: 0.5,
};

/** The only easing curves used on the site. */
export const ease = {
  /** Entrances. */
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Exits. */
  in: "cubic-bezier(0.7, 0, 0.84, 0)",
  /** Position changes that start and end at rest. */
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/** The only durations used on the site, in seconds. */
export const duration = { xs: 0.3, sm: 0.6, md: 1.2, lg: 2.4 } as const;

/** Colour of the light in each act. The world blends between them. */
export const actColour: Record<Act, string> = {
  soul: "#bcd6ff",
  mind: "#8f72ff",
  creation: "#f3c56f",
};

/** Loader: the shortest time the Breath scene stays on screen, in seconds. */
export const loaderMinSeconds = 2.2;

/**
 * The soul: a figure made of particles. `figureKeys` says where its centre
 * is (height in world units) at each point of the scroll.
 */
export const figureKeys: { at: number; y: number }[] = [
  { at: 0.0, y: 0 },
  { at: 0.08, y: 0 },
  { at: 0.2, y: 40 },
  { at: 1.0, y: 40 },
];

export const soul = {
  /** Seconds the particles take to gather into the figure after the loader. */
  gatherSeconds: 6,
  /** How much later the last particles set off, as a share of the gathering. */
  gatherStagger: 0.5,
  /** How far particles trail behind while the soul rises (seconds of lag). */
  trail: 0.11,
  /** Cursor: radius of influence and push distance, in world units. */
  cursorRadius: 0.42,
  cursorPush: 0.06,
} as const;
