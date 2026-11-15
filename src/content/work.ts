/**
 * The Work chapter. Everything shown about your projects, skills and
 * background lives in this one file, so the site can be updated without
 * touching any animation code.
 *
 * - `projects` are the main projects: each gets its own blossom on the tree.
 *   Add, remove or reorder entries freely (up to four fit the tree's route).
 * - `sideProjects` share one final blossom. Leave the list empty to hide it.
 * - `cards` are the glass cards that follow the tree.
 *
 * Pictures live in public/work.
 */
export type Project = {
  id: string;
  title: string;
  /** One short line in italics under the title. */
  tagline: string;
  /** Shown as a small tag, for example "In progress" or "Shipped". */
  status?: string;
  /** Two or three sentences: the problem this project exists to solve. */
  problem: string;
  /** Three or four sentences: what it does and what is notable about it. */
  solution: string;
  /** The tech stack, shown as chips. */
  stack: string[];
  /** Small facts shown under the stack, such as the year or "Team project". */
  facts?: string[];
  image: string;
  /** Link to the code or live project. Leave out to show no link. */
  href?: string;
};

export const projects: Project[] = [
  {
    id: "agri-advisory",
    title: "Smart Agriculture Advisory",
    tagline: "Advice for a farmer's own field, not a district average.",
    status: "In progress",
    problem:
      "Smallholder farmers in India get generic advice. Weather, market prices, government schemes and crop guidance sit in different places, and rarely speak to one particular field.",
    solution:
      "One app that knows the farm. It tracks crop stage, advises irrigation from an FAO-56 water balance, fuses weather from three sources and follows mandi prices. A chat advisor answers from ICAR and IMD sources and checks leaf photos for disease. When data is missing, it says so instead of guessing.",
    stack: ["React", "FastAPI", "Supabase pgvector", "RAG", "Groq", "Gemini"],
    facts: ["2026"],
    image: "/work/agri.svg",
    href: "https://github.com/jinayrshah/ai-smart-adv-system",
  },
  {
    id: "heatshield",
    title: "HeatShield",
    tagline: "Heat risk for the people who work outside, hour by hour.",
    status: "In progress",
    problem:
      "Weather apps report air temperature, which misleads in humid cities like Mumbai. Construction workers, street vendors and delivery riders need to know how dangerous the heat is where they work, and what to do about it.",
    solution:
      "Computes WBGT, the occupational heat-stress standard that accounts for humidity, sun, wind and workload, from an hourly forecast. It turns that into a risk level and work and rest minutes per hour using NIOSH and ISO 7243 limits. The physics engine matches ECMWF's reference to within 0.01 °C. Next: street-level ML, low-cost sensors and alerts in Hindi and Marathi.",
    stack: ["Python", "WBGT physics model", "Open-Meteo", "NIOSH / ISO 7243"],
    facts: ["2026"],
    image: "/work/heat.svg",
    href: "https://github.com/jinayrshah/heatshield",
  },
  {
    id: "histoscan",
    title: "HistoScan",
    tagline: "A second look at tissue, with the reasoning shown.",
    status: "In progress",
    problem:
      "Reading breast-tissue slides is slow and subjective, and a bare score from a model is hard to trust.",
    solution:
      "Classifies tissue patches as benign or malignant, shows where the model looked with Grad-CAM, and scans larger regions into a probability map. The network is written from scratch in NumPy. On 14 unseen patients it reaches 82.2% recall and 0.871 ROC-AUC. A study prototype, not a diagnostic tool.",
    stack: ["Python", "NumPy CNN", "Grad-CAM", "Flask", "SQLite"],
    facts: ["2026"],
    image: "/work/histoscan.webp",
    href: "https://github.com/jinayrshah/breastcancercnn",
  },
];

export type SideProject = {
  id: string;
  title: string;
  /** One or two sentences. */
  line: string;
  stack: string[];
  image?: string;
};

/** Smaller projects, shown together at the last blossom. */
export const sideTitle = "Side Projects";
export const sideProjects: SideProject[] = [
  {
    id: "edonation",
    title: "E-Donation System",
    line: "Connects donors with volunteers. Donors schedule a pickup, nearby volunteers see it sorted by distance, claim it and carry it through to delivery.",
    stack: ["Java", "Spring Boot", "MySQL"],
    image: "/work/donate.svg",
  },
  {
    id: "ai-casino",
    title: "AI Casino",
    line: "A party game that tests whether you can tell AI from human, across an image round, a real-or-AI video round and a blind live chat.",
    stack: ["React", "TypeScript", "Socket.io", "Gemini"],
    image: "/work/casino.svg",
  },
  {
    id: "safe-remedy",
    title: "Safe-Remedy",
    line: "A health chatbot that suggests home remedies, filters out anything that clashes with your allergies, and flags emergency symptoms.",
    stack: ["Python", "Flask", "SQLite"],
    image: "/work/remedy.svg",
  },
];

/** How many blossoms the light visits: one per project, plus the side projects. */
export const stops = projects.length + (sideProjects.length > 0 ? 1 : 0);

export type Card = {
  id: string;
  title: string;
  /** One line under the title. */
  line: string;
  items: { name: string; note?: string }[];
};

/** The cards that stack after the tree, in order. */
export const cards: Card[] = [
  {
    id: "skills",
    title: "Skills",
    line: "The roots: what everything else grows from.",
    items: [
      { name: "Machine Learning", note: "CNNs, scikit-learn" },
      { name: "Deep Learning", note: "PyTorch, TensorFlow" },
      { name: "NLP and LLMs", note: "RAG, agents" },
      { name: "Python", note: "FastAPI, Flask" },
      { name: "TypeScript", note: "React, Node.js" },
      { name: "Java", note: "Spring Boot" },
      { name: "Data", note: "SQL, Pandas, Tableau" },
      { name: "Tools", note: "Git, Docker, Linux" },
    ],
  },
  {
    id: "education",
    title: "Education",
    line: "The trunk: where the work is grounded.",
    items: [
      { name: "B.Tech, Information Technology", note: "2028" },
      { name: "K. J. Somaiya Institute of Technology", note: "Mumbai" },
      { name: "Honours in AI and Machine Learning" },
      { name: "Minor in Biomedical Engineering" },
    ],
  },
  {
    id: "beyond",
    title: "Beyond the code",
    line: "The blossoms: learning, leading and building with others.",
    items: [
      { name: "Joint Technical Admin", note: "CSI" },
      { name: "Technical Team", note: "Robocon" },
      { name: "Google Data Analytics", note: "Certificate" },
      { name: "Google AI Essentials", note: "Certificate" },
      { name: "JPMorgan Software Engineering", note: "Forage" },
    ],
  },
];
