"use client";

import type { CSSProperties } from "react";
import { story } from "@/content/story";
import { useStore } from "@/lib/store";
import { scenes } from "@/motion/timeline";

const delay = (i: number) => ({ "--i": i }) as CSSProperties;

/** A piece of text that rises from behind its own mask. */
function Rise({ children, i }: { children: string; i: number }) {
  return (
    <span className="mask">
      <span className="rise" style={delay(i)}>
        {children}
      </span>
    </span>
  );
}

/**
 * The words over each scene. All copy comes from content/story.ts and is real
 * HTML, so it stays editable, selectable and readable by search engines.
 */
export function StoryOverlay() {
  const sceneIndex = useStore((s) => s.sceneIndex);
  const entered = useStore((s) => s.entered);
  const inWork = useStore((s) => s.inWork);

  return (
    <>
      {scenes.map((scene, index) => {
        const block = story[scene.id];
        const words = block.title?.split(" ") ?? [];
        const Title = index === 0 ? "h1" : "h2";
        let i = 0;
        return (
          <section
            key={scene.id}
            className="block"
            data-scene={scene.id}
            data-align={block.align ?? "center"}
            data-active={
              entered &&
              sceneIndex === index &&
              // The Work chapter takes over from the line that introduces it.
              !(inWork && scene.id === "constellation")
            }
            aria-label={scene.name}
          >
            {block.eyebrow && (
              <p className="label" style={{ margin: 0 }}>
                <Rise i={i++}>{block.eyebrow}</Rise>
              </p>
            )}
            {block.title && (
              <Title className="block__title" aria-label={block.title}>
                {words.map((word, w) => (
                  <span key={w} aria-hidden>
                    <Rise i={i++}>{word}</Rise>
                    {w < words.length - 1 ? " " : ""}
                  </span>
                ))}
              </Title>
            )}
            {block.lines && (
              <div className="block__lines">
                {block.lines.map((line, l) => (
                  <p key={l} className="block__line">
                    <Rise i={i++ + 1}>{line}</Rise>
                  </p>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
