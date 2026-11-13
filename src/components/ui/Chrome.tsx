"use client";

import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { scenes, work as workTiming } from "@/motion/timeline";

const spineScenes = scenes.filter((s) => s.spine);
const [first, ...rest] = site.name.split(" ");
const last = rest.join(" ");
const pad = (n: number) => String(n).padStart(2, "0");

/** Where a jump should land: a little way into the scene, once its text is in. */
const landing = (s: (typeof scenes)[number]) =>
  s.start + (s.end - s.start) * 0.45;

/** The quiet interface around the film: mark, skip link, location and spine. */
export function Chrome() {
  const sceneIndex = useStore((s) => s.sceneIndex);
  const scrollToProgress = useStore((s) => s.scrollToProgress);
  const scrollToWork = useStore((s) => s.scrollToWork);
  const scene = scenes[sceneIndex];

  // The spine light that is lit: the current scene, or the last lit one before it.
  let activeSpine: string = spineScenes[0].id;
  for (let i = sceneIndex; i >= 0; i--) {
    if (scenes[i].spine) {
      activeSpine = scenes[i].id;
      break;
    }
  }

  return (
    <div className="chrome">
      <span className="mark" aria-hidden>
        <span className="mark__first">{first}</span>
        <span className="mark__last">{last}</span>
      </span>

      <button
        type="button"
        className="skip label"
        onClick={() => scrollToWork(workTiming.at(0))}
      >
        Skip to work
      </button>

      <p className="where label" aria-live="polite">
        <span className="where__index">
          {pad(sceneIndex + 1)} / {pad(scenes.length)}
        </span>
        <span className="where__name">{scene.name}</span>
      </p>

      <nav aria-label="Chapters">
        <ol className="spine">
          {spineScenes.map((s) => (
            <li
              key={s.id}
              className="spine__item"
              data-active={s.id === activeSpine}
            >
              <button
                type="button"
                className="spine__button"
                aria-label={`Go to ${s.name}`}
                aria-current={s.id === activeSpine ? "step" : undefined}
                onClick={() => scrollToProgress(landing(s))}
              >
                <span className="spine__dot" />
              </button>
              <span className="spine__name label" aria-hidden>
                {s.name}
              </span>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
