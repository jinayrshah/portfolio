import { create } from "zustand";

export type Tier = "high" | "mid" | "low";

type State = {
  /** Scroll progress through the film, 0..1. Read in frames via getState(). */
  progress: number;
  /** Progress through the Work chapter, 0..1; the film holds while it plays. */
  work: number;
  /** True once the Work chapter has begun. Changes rarely. */
  inWork: boolean;
  /** Scroll velocity, used for motion response. */
  velocity: number;
  /** Index of the scene the visitor is in. Changes rarely; safe to subscribe to. */
  sceneIndex: number;
  /** Real loading progress, 0..1. */
  loadProgress: number;
  /** True once the loader has finished its exit. */
  entered: boolean;
  /** True once the 3D canvas has drawn its first frame (or cannot draw). */
  canvasReady: boolean;
  webgl: boolean;
  tier: Tier;
  reducedMotion: boolean;
  /** Pointer position, -1..1 on both axes. */
  pointer: { x: number; y: number };
  /** True once a mouse or pen has moved; false on touch-only devices. */
  pointerActive: boolean;
  /** Jump to a point in the film. Set by the scroll controller. */
  scrollToProgress: (p: number) => void;
  /** Jump to a point in the Work chapter, 0..1. */
  scrollToWork: (w: number) => void;
};

export const useStore = create<State>(() => ({
  progress: 0,
  work: 0,
  inWork: false,
  velocity: 0,
  sceneIndex: 0,
  loadProgress: 0,
  entered: false,
  canvasReady: false,
  webgl: true,
  tier: "high",
  reducedMotion: false,
  pointer: { x: 0, y: 0 },
  pointerActive: false,
  scrollToProgress: () => {},
  scrollToWork: () => {},
}));
