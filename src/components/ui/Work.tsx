"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import {
  cards,
  projects,
  sideProjects,
  sideTitle,
  stops,
} from "@/content/work";
import { useStore } from "@/lib/store";
import { treeNow } from "@/motion/now";
import { creation, work } from "@/motion/timeline";

const pad = (n: number) => String(n).padStart(2, "0");
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v: number, a: number, b: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** The tree picture's size in route units (see `creation.routes`). */
const VIEW_W = 1376;
const VIEW_H = 768;

/** A smooth path through the route's points. */
function routePath(points: [number, number][]) {
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    d += ` Q${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`;
  }
  const [lx, ly] = points[points.length - 1];
  return `${d} L${lx},${ly}`;
}

/** A title whose letters rise one after another. */
function Letters({ title }: { title: string }) {
  return (
    <h3 className="proj__title" aria-label={title}>
      {title.split(" ").map((word, w) => (
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
  );
}

/**
 * The Work chapter. A light rises from the tree's root and flows along its
 * branches to one blossom per project; as it arrives the blossom brightens and
 * the project opens beside the tree. Then the cards stack over the resting
 * tree. Every move is driven by the scroll. Copy and pictures come from
 * content/work.ts; the light's routes from `creation.routes` in timeline.ts.
 */
export function Work() {
  const root = useRef<HTMLElement>(null);
  const scrollToWork = useStore((s) => s.scrollToWork);
  const routes = creation.routes.slice(0, stops);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const canopy = el.querySelector<SVGSVGElement>(".canopy")!;
    const trails = Array.from(
      el.querySelectorAll<SVGPathElement>(".canopy__trail"),
    );
    const blossoms = Array.from(
      el.querySelectorAll<SVGGElement>(".canopy__blossom"),
    );
    const head = el.querySelector<SVGCircleElement>(".canopy__head")!;
    const link = el.querySelector<SVGPathElement>(".work__link")!;
    const panels = Array.from(el.querySelectorAll<HTMLElement>(".leaf"));
    const stack = el.querySelector<HTMLElement>(".cards")!;
    const cardEls = Array.from(el.querySelectorAll<HTMLElement>(".card"));
    const lengths = trails.map((t) => t.getTotalLength());
    const count = panels.length;
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
      const on = s.work > 0 && u > -1 && u < work.end - 0.001;
      if (!on && !shown) return;
      shown = on;
      el.style.visibility = on ? "visible" : "hidden";
      if (!on) {
        // Children that were shown on their own must be hidden with the chapter.
        stack.style.visibility = "hidden";
        stack.style.opacity = "0";
        panels.forEach((panel) => (panel.style.visibility = "hidden"));
        return;
      }

      // Lay the route over the tree exactly where the tree is drawn.
      const W = window.innerWidth;
      const H = window.innerHeight;
      const unit = H / 2;
      const treeH = treeNow.scale * unit;
      const treeW = treeH * creation.pictureAspect;
      const baseX = W / 2 + treeNow.x * unit;
      const baseY = H / 2 - treeNow.y * unit;
      // On a tall screen the tree is wider than the screen, so the route is
      // drawn narrower about the trunk and every blossom stays in view.
      const narrowScreen = W / H < 1.1;
      const routeW = narrowScreen ? treeW * 0.42 : treeW;
      const left = baseX - creation.treeBase[0] * routeW;
      const top = baseY - (1 - creation.treeBase[1]) * treeH;
      canopy.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      canopy.style.width = `${routeW}px`;
      canopy.style.height = `${treeH}px`;
      canopy.style.opacity = String(treeNow.focus);

      // The light's journey: hop i ends at project i's blossom.
      let headAt: DOMPoint | null = null;
      trails.forEach((trail, i) => {
        const travel = smooth(u!, i - 0.95, i - 0.3);
        const visited = smooth(u!, i + 0.3, i + 0.9);
        trail.style.strokeDashoffset = String(1 - travel);
        trail.style.opacity = String(travel > 0 ? 1 - visited * 0.6 : 0);
        if (travel > 0 && travel < 1)
          headAt = trail.getPointAtLength(travel * lengths[i]);
      });
      if (headAt) {
        head.setAttribute("cx", String((headAt as DOMPoint).x));
        head.setAttribute("cy", String((headAt as DOMPoint).y));
        head.style.opacity = "1";
      } else head.style.opacity = "0";

      let current = -1;
      let currentOpen = 0;
      blossoms.forEach((blossom, i) => {
        const arrived = smooth(u!, i - 0.38, i - 0.22);
        const open = arrived * (1 - smooth(u!, i + 0.35, i + 0.7));
        blossom.style.setProperty("--lit", String(arrived));
        blossom.style.setProperty("--open", String(open));
        if (open > currentOpen) {
          currentOpen = open;
          current = i;
        }
      });

      panels.forEach((panel, i) => {
        const inn = smooth(u!, i - 0.35, i - 0.02);
        const out = smooth(u!, i + 0.3, i + 0.62);
        const visible = inn > 0 && out < 1;
        panel.style.visibility = visible ? "visible" : "hidden";
        panel.style.setProperty("--in", String(inn));
        panel.style.setProperty("--out", String(out));
      });

      // A thread of light from the open blossom to its project's title.
      if (current >= 0) {
        const [bx, by] = routes[current][routes[current].length - 1];
        const x0 = left + (bx / VIEW_W) * routeW;
        const y0 = top + (by / VIEW_H) * treeH;
        const title = panels[current]
          .querySelector(".proj__title")!
          .getBoundingClientRect();
        const narrow = W / H < 1.1;
        const x1 = narrow ? title.left + 12 : title.left - 18;
        const y1 = narrow ? title.top - 10 : title.top + title.height * 0.3;
        const mx = (x0 + x1) / 2;
        link.setAttribute(
          "d",
          narrow
            ? `M${x0},${y0} C${x0},${(y0 + y1) / 2} ${x1},${(y0 + y1) / 2} ${x1},${y1}`
            : `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`,
        );
        link.style.opacity = String(currentOpen * 0.55);
      } else link.style.opacity = "0";

      // The cards rise over the resting tree.
      const c = u - count;
      stack.style.visibility = c > -1 ? "visible" : "hidden";
      stack.style.opacity = String(
        1 - smooth(Math.max(u, goal), work.end - 0.9, work.end - 0.3),
      );
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
  }, [routes]);

  return (
    <section ref={root} className="work" aria-label="Work">
      <svg
        className="canopy"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <filter id="canopy-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="canopy-bloom">
            <stop offset="0" stopColor="#fff6ea" stopOpacity="1" />
            <stop offset="0.25" stopColor="#f3dcb8" stopOpacity="0.55" />
            <stop offset="1" stopColor="#d9b98a" stopOpacity="0" />
          </radialGradient>
        </defs>
        {routes.map((points, i) => (
          <path
            key={i}
            className="canopy__trail"
            d={routePath(points)}
            pathLength={1}
            filter="url(#canopy-glow)"
          />
        ))}
        {routes.map((points, i) => {
          const [x, y] = points[points.length - 1];
          return (
            <g
              key={i}
              className="canopy__blossom"
              style={{ "--lit": 0, "--open": 0 } as CSSProperties}
              onClick={() => scrollToWork(work.at(i))}
            >
              <circle
                className="canopy__halo"
                cx={x}
                cy={y}
                r={70}
                fill="url(#canopy-bloom)"
              />
              <circle className="canopy__dot" cx={x} cy={y} r={6} />
              <circle className="canopy__hit" cx={x} cy={y} r={30}>
                <title>{projects[i]?.title ?? sideTitle}</title>
              </circle>
            </g>
          );
        })}
        <circle className="canopy__head" r={9} filter="url(#canopy-glow)" />
      </svg>

      <svg className="work__threads" aria-hidden>
        <path className="work__link" />
      </svg>

      {projects.map((p, i) => (
        <article key={p.id} className="leaf" aria-label={p.title}>
          <p className="proj__index label">
            <span>{pad(i + 1)}</span>
            <span className="proj__of">/ {pad(projects.length)}</span>
            {p.status && <span className="leaf__status">{p.status}</span>}
          </p>
          <Letters title={p.title} />
          <p className="leaf__tagline">{p.tagline}</p>
          <div className="leaf__preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="" loading="lazy" decoding="async" />
          </div>
          <div className="proj__meta">
            <div className="leaf__part leaf__part--problem">
              <p className="leaf__label label">The problem</p>
              <p className="proj__line">{p.problem}</p>
            </div>
            <div className="leaf__part">
              <p className="leaf__label label">What it does</p>
              <p className="proj__line">{p.solution}</p>
            </div>
            <ul className="proj__tags label">
              {p.stack.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <p className="proj__facts label">
              {p.facts?.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
              {p.href && (
                <a
                  className="proj__link"
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.linkLabel ?? "View project"}
                </a>
              )}
            </p>
          </div>
        </article>
      ))}

      {sideProjects.length > 0 && (
        <article className="leaf leaf--side" aria-label={sideTitle}>
          <p className="proj__index label">
            <span>Also built</span>
          </p>
          <Letters title={sideTitle} />
          <ul className="proj__meta side">
            {sideProjects.map((p) => (
              <li key={p.id} className="side__item">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="side__image"
                    src={p.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div>
                  <h4 className="side__title">{p.title}</h4>
                  <p className="proj__line">{p.line}</p>
                  <ul className="proj__tags label">
                    {p.stack.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </article>
      )}

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
