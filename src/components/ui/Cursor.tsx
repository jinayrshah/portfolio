"use client";

import { useEffect, useRef } from "react";
import { smoothDamp } from "@/lib/spring";
import { useStore } from "@/lib/store";
import { cursor, work } from "@/motion/timeline";

type Mode = "idle" | "grab" | "link" | "open";

/**
 * The cursor: a small ember of the site's light. A bright core follows the
 * pointer exactly, a thin ring follows with weight, and fast movement leaves a
 * short tail of dust. It changes over the soul (grab), over links and buttons,
 * and over the tree's blossoms (open). Mouse and pen only; touch devices and
 * reduced motion keep the normal cursor. Sizes and timing live in
 * `cursor` in timeline.ts.
 */
export function Cursor() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches || useStore.getState().reducedMotion) return;

    const core = el.querySelector<HTMLElement>(".cursor__core")!;
    const ring = el.querySelector<HTMLElement>(".cursor__ring")!;
    const label = el.querySelector<HTMLElement>(".cursor__label")!;
    const motes = Array.from(el.querySelectorAll<HTMLElement>(".cursor__mote"));
    document.documentElement.classList.add("has-cursor");

    const p = { x: -100, y: -100 };
    const r = { x: -100, y: -100, size: cursor.size.idle as number };
    const v = { x: { v: 0 }, y: { v: 0 }, size: { v: 0 } };
    const trail = motes.map(() => ({ x: -100, y: -100 }));
    let seen = false;
    let pressed = false;
    let target: Element | null = null;
    let frame = 0;
    let last = performance.now();
    let speed = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      p.x = e.clientX;
      p.y = e.clientY;
      target = e.target as Element | null;
      if (!seen) {
        seen = true;
        r.x = p.x;
        r.y = p.y;
        trail.forEach((t) => ((t.x = p.x), (t.y = p.y)));
        el.style.opacity = "1";
      }
    };
    const onDown = () => (pressed = true);
    const onUp = () => (pressed = false);
    const onLeave = () => {
      seen = false;
      el.style.opacity = "0";
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      if (!seen) return;
      const s = useStore.getState();

      // What is under the pointer decides the cursor's mode.
      const blossom = target?.closest?.(".canopy__blossom") ?? null;
      const link = target?.closest?.("a, button, [role='button']") ?? null;
      let mode: Mode = "idle";
      if (blossom) mode = "open";
      else if (link) mode = "link";
      else if (s.entered && s.progress < cursor.grabUntil) mode = "grab";

      // The ring settles onto a blossom; otherwise it trails the pointer.
      let gx = p.x;
      let gy = p.y;
      if (blossom) {
        const dot = blossom
          .querySelector(".canopy__dot")
          ?.getBoundingClientRect();
        if (dot) {
          gx = dot.left + dot.width / 2;
          gy = dot.top + dot.height / 2;
        }
      }
      const goalSize =
        cursor.size[mode] * (pressed && mode === "grab" ? 0.7 : 1);
      r.x = smoothDamp(r.x, gx, v.x, cursor.ringLag, dt);
      r.y = smoothDamp(r.y, gy, v.y, cursor.ringLag, dt);
      r.size = smoothDamp(r.size, goalSize, v.size, 0.18, dt);

      const moved = Math.hypot(p.x - trail[0].x, p.y - trail[0].y);
      speed += (Math.min(moved / Math.max(dt, 0.001), 3000) - speed) * 0.2;

      core.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) scale(${
        mode === "link" || mode === "open" ? 0.45 : pressed ? 1.5 : 1
      })`;
      ring.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
      ring.style.width = ring.style.height = `${r.size}px`;
      el.dataset.mode = mode;
      el.dataset.pressed = String(pressed);
      // Paler ivory through the soul, warmer gold once creation begins.
      el.dataset.act = s.progress < cursor.warmFrom ? "soul" : "creation";

      // A word under the ring where it helps.
      let text = "";
      if (mode === "open") text = "Open";
      else if (mode === "idle" && s.work > 0) {
        const u = work.position(s.work);
        if (u > -0.4 && u < 0.5) text = "Scroll";
      }
      if (label.textContent !== text) label.textContent = text;
      label.style.transform = `translate3d(${r.x}px, ${r.y + r.size / 2 + 12}px, 0)`;
      label.style.opacity = text ? "1" : "0";

      // The tail: each mote follows the one before it, and shows only at speed.
      for (let i = trail.length - 1; i > 0; i--) {
        trail[i].x += (trail[i - 1].x - trail[i].x) * 0.55;
        trail[i].y += (trail[i - 1].y - trail[i].y) * 0.55;
      }
      trail[0].x = p.x;
      trail[0].y = p.y;
      const show = Math.min(1, Math.max(0, (speed - 250) / 1200));
      motes.forEach((m, i) => {
        const t = trail[i + 1] ?? trail[i];
        const fade = 1 - (i + 1) / (motes.length + 1);
        m.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${fade})`;
        m.style.opacity = String(show * fade * cursor.tail);
      });
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div ref={root} className="cursor" aria-hidden data-mode="idle">
      {Array.from({ length: cursor.motes }, (_, i) => (
        <span key={i} className="cursor__mote" />
      ))}
      <span className="cursor__ring" />
      <span className="cursor__core" />
      <span className="cursor__label label" />
    </div>
  );
}
