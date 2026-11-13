"use client";

import { useEffect, useRef, useState } from "react";
import type { Soundscape } from "@/lib/soundscape";
import { useStore } from "@/lib/store";

const BARS = 28;

/**
 * Sound on and off. A row of fine bars: while the sound plays they move with
 * it, and when it stops they settle into a quiet resting line. Sound is always
 * off until the visitor turns it on.
 */
export function SoundToggle() {
  const [on, setOn] = useState(false);
  const scape = useRef<Soundscape | null>(null);
  const bars = useRef<HTMLSpanElement[]>([]);
  const onRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    const levels = new Array(BARS).fill(0.08);
    let buffer: Uint8Array<ArrayBuffer> | null = null;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const s = scape.current;
      const playing = onRef.current && s;
      if (s) s.follow(useStore.getState().progress);
      if (playing && s) {
        buffer ??= new Uint8Array(s.analyser.frequencyBinCount);
        s.analyser.getByteFrequencyData(buffer);
      }
      for (let i = 0; i < BARS; i++) {
        // Mirrored about the centre, so the row swells from its middle.
        const k = Math.abs(i - (BARS - 1) / 2) / (BARS / 2);
        let goal: number;
        if (playing && buffer) {
          const bin = Math.floor(2 + k * 22);
          const wave = 0.5 + 0.5 * Math.sin(now / 420 + i * 0.9);
          goal = Math.min(
            1,
            (buffer[bin] / 255) * 1.6 * (1 - k * 0.45) + wave * 0.18,
          );
        } else {
          goal = 0.14 + 0.05 * Math.sin(now / 900 + i * 0.6);
        }
        levels[i] += (goal - levels[i]) * 0.18;
        const bar = bars.current[i];
        if (bar) bar.style.transform = `scaleY(${levels[i].toFixed(3)})`;
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggle = async () => {
    if (!scape.current) {
      const { Soundscape } = await import("@/lib/soundscape");
      scape.current = new Soundscape();
    }
    const next = !onRef.current;
    onRef.current = next;
    scape.current.setOn(next);
    setOn(next);
  };

  return (
    <button
      type="button"
      className="sound"
      data-on={on}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
    >
      <span className="sound__bars" aria-hidden>
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            className="sound__bar"
            ref={(el) => {
              if (el) bars.current[i] = el;
            }}
          />
        ))}
      </span>
      <span className="sound__label label">
        {on ? "Sound on" : "Sound off"}
      </span>
    </button>
  );
}
