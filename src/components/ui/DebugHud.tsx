"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { scenes } from "@/motion/timeline";

/** Add ?debug to the address to see progress, scene and frame rate while tuning. */
export function DebugHud() {
  const [on, setOn] = useState(false);
  const out = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(new URLSearchParams(window.location.search).has("debug"));
  }, []);

  useEffect(() => {
    if (!on) return;
    let frame = 0;
    let last = performance.now();
    let fps = 60;
    const tick = (now: number) => {
      fps += (1000 / Math.max(1, now - last) - fps) * 0.05;
      last = now;
      const { progress, sceneIndex, tier } = useStore.getState();
      if (out.current) {
        out.current.textContent = `${(progress * 100).toFixed(1)}%  ${scenes[sceneIndex].id}  ${fps.toFixed(0)}fps  ${tier}`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on]);

  return on ? <div ref={out} className="debug" /> : null;
}
