/**
 * The Work chapter: the projects shown one at a time, then the cards.
 * To add a project, add one entry to `projects`; the scroll grows to fit it.
 * Pictures live in public/work. `soft` is a small blurred copy used as the
 * backdrop; if you leave it out the main picture is used.
 * Everything below is a PLACEHOLDER until the resume arrives.
 */
export type Project = {
  id: string;
  title: string;
  /** One line about the project. */
  line: string;
  role: string;
  year: string;
  tags: string[];
  image: string;
  soft?: string;
  /** Optional link to the live project or its write-up. */
  href?: string;
};

const picture = (n: string) => ({
  image: `/work/placeholder-${n}.webp`,
  soft: `/work/placeholder-${n}-soft.webp`,
});

export const projects: Project[] = [
  {
    id: "project-01",
    title: "Project One",
    line: "One line about what this project is and why it mattered.",
    role: "Role",
    year: "2026",
    tags: ["Skill A", "Skill B", "Skill C"],
    ...picture("01"),
  },
  {
    id: "project-02",
    title: "Project Two",
    line: "One line about what this project is and why it mattered.",
    role: "Role",
    year: "2025",
    tags: ["Skill B", "Skill D"],
    ...picture("02"),
  },
  {
    id: "project-03",
    title: "Project Three",
    line: "One line about what this project is and why it mattered.",
    role: "Role",
    year: "2025",
    tags: ["Skill A", "Skill C"],
    ...picture("03"),
  },
  {
    id: "project-04",
    title: "Project Four",
    line: "One line about what this project is and why it mattered.",
    role: "Role",
    year: "2024",
    tags: ["Skill C", "Skill D"],
    ...picture("04"),
  },
  {
    id: "project-05",
    title: "Project Five",
    line: "One line about what this project is and why it mattered.",
    role: "Role",
    year: "2024",
    tags: ["Skill A", "Skill D"],
    ...picture("05"),
  },
];

export type Card = {
  id: string;
  title: string;
  /** One line under the title. */
  line: string;
  items: { name: string; note?: string }[];
};

/** The cards that stack after the projects, in order. */
export const cards: Card[] = [
  {
    id: "skills",
    title: "Skills",
    line: "The roots: what everything else grows from.",
    items: [
      { name: "Skill A", note: "Area" },
      { name: "Skill B", note: "Area" },
      { name: "Skill C", note: "Area" },
      { name: "Skill D", note: "Area" },
      { name: "Skill E", note: "Area" },
      { name: "Skill F", note: "Area" },
    ],
  },
  {
    id: "research",
    title: "Research",
    line: "The blossoms: questions followed all the way through.",
    items: [
      { name: "Paper or study 01", note: "Venue, year" },
      { name: "Paper or study 02", note: "Venue, year" },
      { name: "Paper or study 03", note: "Venue, year" },
    ],
  },
  {
    id: "achievements",
    title: "Achievements",
    line: "The stars: moments worth marking.",
    items: [
      { name: "Award or milestone 01", note: "Year" },
      { name: "Award or milestone 02", note: "Year" },
      { name: "Award or milestone 03", note: "Year" },
    ],
  },
];
