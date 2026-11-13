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
    position: [0, -0.6, 7.4],
    target: [0, -0.6, 0],
    fov: 38,
  },
  {
    name: "genesis-close",
    at: 0.08,
    position: [0, -0.3, 6.4],
    target: [0, -0.3, 0],
    fov: 38,
  },
  // The camera climbs with the soul, a breath behind it.
  {
    name: "ascent-lift",
    at: 0.11,
    position: [0, 2.8, 7.2],
    target: [0, 3.9, 0],
    fov: 40,
  },
  {
    name: "ascent-flight",
    at: 0.14,
    position: [0, 18.2, 8.4],
    target: [0, 20.2, 0],
    fov: 46,
  },
  {
    name: "ascent-slow",
    at: 0.17,
    position: [0, 33.4, 9],
    target: [0, 36, 0],
    fov: 46,
  },
  {
    name: "ascent-arrive",
    at: 0.2,
    position: [0, 36.5, 9],
    target: [0, 40, 0],
    fov: 46,
  },
  {
    name: "stillness-drift",
    at: 0.27,
    position: [1.6, 39.9, 8.4],
    target: [0, 39.6, 0],
    fov: 38,
  },
  {
    name: "stillness-front",
    at: 0.34,
    position: [0, 40.4, 6.6],
    target: [0, 40.2, 0],
    fov: 36,
  },
  {
    name: "awakening-enter",
    at: 0.42,
    position: [0, 40.5, 3.3],
    target: [0, 40.5, 0],
    fov: 42,
  },
  {
    name: "awakening-inside",
    at: 0.5,
    position: [0, 40.48, 2.5],
    target: [0, 40.48, 0],
    fov: 50,
  },
  {
    name: "intention-heart",
    at: 0.6,
    position: [0, 40.48, 3.6],
    target: [0, 40.48, 0],
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
  soul: "#f6dcb0",
  mind: "#ffe2b0",
  creation: "#f3c56f",
};

/** Loader: the shortest time the Breath scene stays on screen, in seconds. */
export const loaderMinSeconds = 2.2;

/**
 * The soul: a figure of smoke and light, drawn from public/soul/soul.webp
 * and from particles sampled out of it. `figureKeys` says where it is
 * (height in world units) at each point of the scroll.
 */
export const figureKeys: { at: number; y: number }[] = [
  { at: 0.0, y: 0 },
  { at: 0.08, y: 0 },
  { at: 0.2, y: 40 },
  { at: 1.0, y: 40 },
];

export const soul = {
  /** The picture of the soul. Replace the file to change the figure. */
  image: "/soul/soul.webp",
  /** Width divided by height of that picture. */
  aspect: 941 / 1672,
  /** Height of the picture in world units. */
  height: 5.8,
  /** Where the heart is in the picture: 0..1 from the left, 0..1 from the bottom. */
  heart: [0.681, 0.65] as [number, number],
  /**
   * The forms the soul passes through after it has risen. Each melts out of
   * the one before over the scroll range `over`. `height` is the picture's
   * height in world units (a smaller picture is a closer view), and `heart`
   * is where its heart is, so every form stays centred on the same point.
   */
  forms: [
    {
      name: "open",
      image: "/soul/open.webp",
      height: 5.8,
      heart: [0.622, 0.749],
      over: [0.2, 0.32],
    },
    {
      name: "heart",
      image: "/soul/heart.webp",
      height: 2.5,
      heart: [0.638, 0.547],
      over: [0.34, 0.47],
    },
    {
      name: "burst",
      image: "/soul/burst.webp",
      height: 6,
      heart: [0.54, 0.57],
      over: [0.49, 0.6],
    },
  ] as {
    name: string;
    image: string;
    height: number;
    heart: [number, number];
    over: [number, number];
  }[],
  /** Ripples from pressing and dragging: their strength, and the drag distance between waves. */
  rippleStrength: 1,
  rippleSpacing: 0.22,
  /** Seconds a change of form takes to settle, however fast the scroll. */
  formSmoothTime: 0.55,
  /** How far the smoke is carried while one form becomes the next (world units). */
  flow: 0.9,
  /** The burst: its tint, how much of its own gold it keeps (0 to 1), and its brightness. */
  burstTint: "#efe1cf",
  burstColour: 0.55,
  burstGain: 0.8,
  /** Scroll range over which the last form fades as the beam leaves. */
  leave: [0.61, 0.68] as [number, number],
  /** Width of the sheet everything is drawn on, in world units. */
  sheet: 16,
  /** How far above the figure's base height the heart sits. */
  heartLift: 0.48,
  /** On wide screens the figure opens to the right of the name, by this share of the half-width. */
  openingShift: 0.5,
  /** Weight of the figure as it follows the scroll; close to the camera's own. */
  followSmoothTime: 0.45,
  /** How bright the particles stay once the figure is whole (0 to 1). */
  restShimmer: 0.3,
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
