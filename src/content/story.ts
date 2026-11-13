import type { SceneId } from "@/motion/timeline";
import { site } from "./site";

/**
 * The words shown over each scene. One entry per scene.
 *  - eyebrow: small label above the title (optional)
 *  - title:   the large serif line (optional)
 *  - lines:   supporting copy, revealed one line at a time
 *  - align:   where the block sits on screen
 * Everything marked PLACEHOLDER is replaced when the resume arrives.
 */
export type StoryBlock = {
  eyebrow?: string;
  title?: string;
  lines?: string[];
  align?: "center" | "left" | "right" | "bottom" | "hero";
};

export const story: Record<SceneId, StoryBlock> = {
  genesis: {
    // Name, role line and tagline come from content/site.ts.
    eyebrow: site.roleLine,
    title: site.name,
    lines: [site.tagline, "Scroll to begin"],
    align: "hero",
  },
  ascent: {
    lines: [
      "Every creation begins in stillness.",
      "Before the work, there is the one who works.",
    ],
    align: "bottom",
  },
  stillness: {
    eyebrow: "About",
    title: "Stillness",
    // PLACEHOLDER: who you are in three sentences.
    lines: [
      "A first sentence about who you are.",
      "A second about what you care about.",
      "A third about where you are headed.",
    ],
    align: "left",
  },
  awakening: {
    eyebrow: "How I think",
    title: "Awakening",
    // PLACEHOLDER: three or four principles or focus areas.
    lines: ["Principle one", "Principle two", "Principle three"],
    align: "right",
  },
  intention: {
    lines: ["Knowledge becomes intention."],
    align: "bottom",
  },
  beam: {
    // PLACEHOLDER: key numbers.
    lines: [
      "00 years building",
      "00 projects shipped",
      "00 papers and studies",
    ],
    align: "bottom",
  },
  bloom: {
    eyebrow: "Act III",
    title: "Creation",
    lines: ["Intention takes root, and grows."],
    align: "right",
  },
  constellation: {
    eyebrow: "Work",
    title: "Everything I have made",
    lines: [
      "Skills, projects, research and achievements arrive here in phase 5.",
    ],
    align: "left",
  },
  return: {
    eyebrow: "Contact",
    title: "Return to stillness",
    // Contact details come from content/site.ts.
    lines: [site.email],
    align: "center",
  },
};
