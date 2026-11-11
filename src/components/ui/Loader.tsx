"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { duration, loaderMinSeconds } from "@/motion/timeline";

/**
 * Scene 0, Breath. A counter tied to real loading, then one slow breath of
 * light that hands over to the film.
 */
export function Loader() {
  const [gone, setGone] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const breath = useRef<HTMLSpanElement>(null);

  // Real loading milestones: fonts, then the first frame of the 3D world.
  useEffect(() => {
    let fonts = false;
    const update = () => {
      const state = useStore.getState();
      const next = (fonts ? 0.4 : 0) + (state.canvasReady ? 0.6 : 0);
      if (next > state.loadProgress) useStore.setState({ loadProgress: next });
    };
    document.fonts.ready.then(() => {
      fonts = true;
      update();
    });
    const unsubscribe = useStore.subscribe(update);
    // Never trap a visitor behind the loader if something fails to report.
    const safety = window.setTimeout(
      () => useStore.setState({ loadProgress: 1 }),
      9000,
    );
    return () => {
      unsubscribe();
      window.clearTimeout(safety);
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const started = performance.now();
    let shown = 0;
    let frame = 0;
    let exiting = false;

    const exit = () => {
      exiting = true;
      const done = () => {
        useStore.setState({ entered: true });
        setGone(true);
      };
      if (reduced) {
        gsap.to(overlay.current, {
          opacity: 0,
          duration: duration.sm,
          onComplete: done,
        });
        return;
      }
      gsap
        .timeline({ onComplete: done })
        // Inhale: the line gathers into a single point.
        .to(count.current, {
          opacity: 0,
          y: -12,
          filter: "blur(6px)",
          duration: duration.sm,
          ease: "power2.in",
        })
        .to(
          rail.current,
          { scaleX: 0, duration: duration.md, ease: "power3.inOut" },
          "<0.1",
        )
        .to(
          breath.current,
          { opacity: 1, scale: 1.6, duration: duration.md, ease: "sine.inOut" },
          "<0.3",
        )
        // Exhale: the point opens into the world behind it.
        .to(breath.current, {
          opacity: 0,
          scale: 14,
          duration: duration.md,
          ease: "power2.out",
        })
        .to(
          overlay.current,
          { opacity: 0, duration: duration.md, ease: "power1.inOut" },
          "<",
        );
    };

    const tick = () => {
      const elapsed = (performance.now() - started) / 1000;
      const target = Math.min(
        useStore.getState().loadProgress,
        elapsed / loaderMinSeconds,
      );
      shown += (target - shown) * 0.08;
      if (target >= 1 && shown > 0.995) shown = 1;
      if (count.current)
        count.current.textContent = String(Math.round(shown * 100)).padStart(
          3,
          "0",
        );
      if (fill.current) fill.current.style.transform = `scaleX(${shown})`;
      if (shown >= 1 && !exiting) exit();
      else if (!exiting) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (gone) return null;

  return (
    <div ref={overlay} className="loader" role="status" aria-label="Loading">
      <div className="loader__inner">
        <span className="label" aria-hidden>
          {site.initials}
        </span>
        <span ref={count} className="loader__count" aria-hidden>
          000
        </span>
        <div ref={rail} className="loader__rail" aria-hidden>
          <span ref={fill} className="loader__fill" />
          <span ref={breath} className="loader__breath" />
        </div>
      </div>
    </div>
  );
}
