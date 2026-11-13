"use client";

import Lenis from "lenis";
import dynamic from "next/dynamic";
import { useEffect, useRef, type CSSProperties } from "react";
import { detectTier, hasWebGL } from "@/lib/device";
import { useStore } from "@/lib/store";
import {
  actColour,
  duration,
  ease,
  sceneIndexAt,
  scenes,
  fromPage,
  toPage,
  TOTAL_SCREENS,
  work as workTiming,
} from "@/motion/timeline";
import { DebugHud } from "./ui/DebugHud";
import { Chrome } from "./ui/Chrome";
import { Loader } from "./ui/Loader";
import { StoryOverlay } from "./ui/StoryOverlay";
import { Work } from "./ui/Work";

const World = dynamic(() => import("./canvas/World"), { ssr: false });

/** Motion tokens from timeline.ts, exposed to CSS so both use one source. */
const motionVars = {
  "--ease-out": ease.out,
  "--ease-in": ease.in,
  "--ease-in-out": ease.inOut,
  "--dur-xs": `${duration.xs}s`,
  "--dur-sm": `${duration.sm}s`,
  "--dur-md": `${duration.md}s`,
  "--dur-lg": `${duration.lg}s`,
} as CSSProperties;

const inOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * The film: one fixed 3D stage, a tall invisible track that provides the
 * scroll distance, and a thin HTML layer for text and interface.
 */
export function Experience() {
  const root = useRef<HTMLDivElement>(null);
  const entered = useStore((s) => s.entered);
  const webgl = useStore((s) => s.webgl);
  const sceneIndex = useStore((s) => s.sceneIndex);

  // Device checks, pointer tracking and the scroll controller.
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const webglOk = hasWebGL();
    useStore.setState({
      webgl: webglOk,
      canvasReady: !webglOk,
      tier: detectTier(),
      reducedMotion: motionQuery.matches,
    });
    const onMotion = () =>
      useStore.setState({ reducedMotion: motionQuery.matches });
    motionQuery.addEventListener("change", onMotion);

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      useStore.setState({
        pointerActive: true,
        pointer: {
          x: (e.clientX / window.innerWidth) * 2 - 1,
          y: -((e.clientY / window.innerHeight) * 2 - 1),
        },
      });
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // The film always starts from the top.
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const limit = () =>
      Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const publish = (scroll: number, velocity: number) => {
      const page = Math.min(1, Math.max(0, scroll / limit()));
      const { progress, work } = fromPage(page);
      const index = sceneIndexAt(progress);
      // True from the moment the first project starts to rise.
      const inWork = work > workTiming.at(-0.6);
      const s = useStore.getState();
      if (s.sceneIndex !== index) useStore.setState({ sceneIndex: index });
      if (s.inWork !== inWork) useStore.setState({ inWork });
      useStore.setState({ progress, work, velocity });
    };

    let lenis: Lenis | null = null;
    let frame = 0;
    const onNativeScroll = () => publish(window.scrollY, 0);

    if (motionQuery.matches) {
      window.addEventListener("scroll", onNativeScroll, { passive: true });
      useStore.setState({
        scrollToProgress: (p) =>
          window.scrollTo({ top: toPage(p) * limit(), behavior: "auto" }),
        scrollToWork: (w) =>
          window.scrollTo({ top: toPage(0, w) * limit(), behavior: "auto" }),
      });
    } else {
      lenis = new Lenis({
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 0.9,
      });
      lenis.on("scroll", (l: Lenis) => publish(l.scroll, l.velocity));
      lenis.stop();
      const raf = (time: number) => {
        lenis!.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
      useStore.setState({
        scrollToProgress: (p) =>
          lenis!.scrollTo(toPage(p) * limit(), {
            duration: duration.lg,
            easing: inOut,
          }),
        scrollToWork: (w) =>
          lenis!.scrollTo(toPage(0, w) * limit(), {
            duration: duration.lg,
            easing: inOut,
          }),
      });
    }

    // Scrolling is locked until the loader has finished.
    const unsubscribe = useStore.subscribe((s, prev) => {
      if (s.entered && !prev.entered) lenis?.start();
    });

    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
      lenis?.destroy();
      window.removeEventListener("scroll", onNativeScroll);
      window.removeEventListener("pointermove", onPointer);
      motionQuery.removeEventListener("change", onMotion);
    };
  }, []);

  // Without Lenis (reduced motion), lock scrolling during the loader with CSS.
  useEffect(() => {
    document.documentElement.style.overflow = entered ? "" : "hidden";
  }, [entered]);

  const act = scenes[sceneIndex].act;

  return (
    <div
      ref={root}
      data-entered={entered}
      style={{ ...motionVars, "--light": actColour[act] } as CSSProperties}
    >
      <div className={webgl ? "stage" : "stage stage--static"}>
        {webgl && <World />}
      </div>
      <div className="vignette" aria-hidden />
      <div
        className="track"
        style={{ height: `${(TOTAL_SCREENS + 1) * 100}svh` }}
        aria-hidden
      />
      <main className="ui">
        <StoryOverlay />
        <Work />
        <Chrome />
      </main>
      <Loader />
      <DebugHud />
    </div>
  );
}
