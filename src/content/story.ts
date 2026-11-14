import type { SceneId } from "@/motion/timeline";
import { site } from "./site";

/**
 * The words shown over each scene. One entry per scene.
 *  - eyebrow: small label above the title (optional)
 *  - title:   the large serif line (optional)
 *  - lines:   supporting copy, revealed one line at a time
 *  - align:   where the block sits on screen
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
    lines: [
      "An Information Technology student in Mumbai.",
      "Drawn to AI, language and the software around them.",
      "Headed toward applied AI research.",
    ],
    align: "left",
  },
  awakening: {
    eyebrow: "How I think",
    title: "Awakening",
    lines: [
      "Start from a real problem.",
      "Build it to understand it.",
      "Say what the system does not know.",
    ],
    align: "right",
  },
  intention: {
    lines: ["Knowledge becomes intention."],
    align: "bottom",
  },
  beam: {
    lines: [
      "I learn by building.",
      "AI that solves practical problems,",
      "for the people who need it most.",
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
    lines: ["Projects, skills and the path so far. Keep scrolling."],
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
