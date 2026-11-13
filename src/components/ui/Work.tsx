"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cards, projects } from "@/content/work";
import { useStore } from "@/lib/store";
import { work } from "@/motion/timeline";

const pad = (n: number) => String(n).padStart(2, "0");
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v: number, a: number, b: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * The Work chapter. Projects arrive one per scroll step: the next one rises
 * over the current, which sinks back and dims. Then the cards stack. Every
 * move is driven by the scroll, with a little weight added so nothing snaps.
 * All copy and pictures come from content/work.ts.
 */
export function Work() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const slides = Array.from(el.querySelectorAll<HTMLElement>(".proj"));
    const stack = el.querySelector<HTMLElement>(".cards")!;
    const cardEls = Array.from(el.querySelectorAll<HTMLElement>(".card"));
    const under = el.querySelector<HTMLElement>(".work__under")!;
    const count = slides.length;
    let frame = 0;
    let u: number | null = null;
    let shown = false;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const s = useStore.getState();
      const goal = work.position(s.work);
      // Follow the scroll with a little weight.
      u = u === null || s.reducedMotion ? goal : u + (goal - u) * 0.14;
      if (Math.abs(goal - u) < 0.0002) u = goal;
      const on = u > -1 && u < work.end - 0.001;
      if (!on && !shown) return;
      shown = on;
      el.style.visibility = on ? "visible" : "hidden";
      if (!on) return;

      // A dark floor under the projects, so only they are seen.
      under.style.opacity = String(
        smooth(u, -0.5, 0) * (1 - smooth(u, count - 1, count - 0.35)),
      );

      slides.forEach((slide, i) => {
        const t = u! - i;
        if (t <= -1 || t >= 1) {
          slide.style.visibility = "hidden";
          return;
        }
        slide.style.visibility = "visible";
        const enter = t < 0 ? outCubic(1 + t) : 1; // 0 below the screen, 1 in place
        const leave = t > 0 ? t : 0;
        slide.style.transform = `translate3d(0, ${(1 - enter) * 100}%, 0) scale(${1 - leave * 0.1})`;
        slide.style.opacity = String(1 - smooth(leave, 0.15, 0.95));
        slide.style.setProperty("--round", `${(1 - enter) * 2.2}rem`);
        // The picture drifts inside its frame; the words arrive late and leave early.
        slide.style.setProperty("--drift", String(t));
        slide.style.setProperty("--in", String(smooth(t, -0.55, 0)));
        slide.style.setProperty("--out", String(smooth(t, 0, 0.5)));
      });

      const c = u - count;
      stack.style.visibility = c > -1 ? "visible" : "hidden";
      stack.style.opacity = String(1 - smooth(u, work.end - 0.6, work.end));
      cardEls.forEach((card, j) => {
        const t = c - j;
        const enter = t < 0 ? outCubic(clamp(1 + t)) : 1;
        const behind = clamp(t, 0, cardEls.length);
        card.style.transform = `translate3d(0, calc(${(1 - enter) * 110}vh - ${behind * 1.5}rem), 0) scale(${1 - behind * 0.05})`;
        card.style.setProperty("--shade", String(clamp(behind * 0.4, 0, 0.7)));
      });
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section ref={root} className="work" aria-label="Work">
      <div className="work__under" aria-hidden />
      {projects.map((p, i) => {
        const next = projects[i + 1];
        return (
          <article
            key={p.id}
            className="proj"
            style={{ zIndex: i + 1 } as CSSProperties}
          >
            <div
              className="proj__back"
              style={{ backgroundImage: `url(${p.soft ?? p.image})` }}
              aria-hidden
            />
            <div className="proj__frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="proj__img"
                src={p.image}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="proj__index label">
              <span>{pad(i + 1)}</span>
              <span className="proj__of">/ {pad(projects.length)}</span>
            </p>
            <h3 className="proj__title" aria-label={p.title}>
              {p.title.split(" ").map((word, w) => (
                <span key={w} className="proj__word" aria-hidden>
                  {Array.from(word).map((letter, l) => (
                    <span key={l} className="proj__mask">
                      <span
                        className="proj__letter"
                        style={{ "--l": w * 3 + l } as CSSProperties}
                      >
                        {letter}
                      </span>
                    </span>
                  ))}
                </span>
              ))}
            </h3>
            <div className="proj__meta">
              <p className="proj__line">{p.line}</p>
              <ul className="proj__tags label">
                {p.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              <p className="proj__facts label">
                <span>{p.role}</span>
                <span>{p.year}</span>
              </p>
              {p.href && (
                <a className="proj__link label" href={p.href}>
                  View project
                </a>
              )}
            </div>
            {next && (
              <p className="proj__next label" aria-hidden>
                <span
                  className="proj__thumb"
                  style={{ backgroundImage: `url(${next.soft ?? next.image})` }}
                />
                <span>
                  Next
                  <br />
                  <b>{next.title}</b>
                </span>
              </p>
            )}
          </article>
        );
      })}

      <div className="cards">
        {cards.map((card, j) => (
          <article
            key={card.id}
            className="card"
            style={{ zIndex: j + 1 } as CSSProperties}
          >
            <header className="card__head">
              <span className="card__number">{pad(j + 1)}</span>
              <div>
                <h3 className="card__title">{card.title}</h3>
                <p className="card__line">{card.line}</p>
              </div>
            </header>
            <ul className="card__items">
              {card.items.map((item) => (
                <li key={item.name}>
                  <span>{item.name}</span>
                  {item.note && <span className="label">{item.note}</span>}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
