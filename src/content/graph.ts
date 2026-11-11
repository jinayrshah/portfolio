/**
 * The knowledge graph: every skill, project, research item and achievement.
 * To add something, add one node and (optionally) links to related nodes.
 * The galaxy and the list view are both generated from this file (phase 5).
 * All entries below are PLACEHOLDERS until the resume arrives.
 */
export type NodeType = "skill" | "project" | "research" | "achievement";

export type GraphNode = {
  id: string;
  type: NodeType;
  title: string;
  summary?: string;
  /** Optional detail shown in the panel. */
  role?: string;
  stack?: string[];
  year?: string;
  href?: string;
  /** Featured projects also get a full case-study page. */
  featured?: boolean;
};

export type GraphLink = { from: string; to: string };

export const nodes: GraphNode[] = [
  { id: "skill-a", type: "skill", title: "Skill A" },
  { id: "skill-b", type: "skill", title: "Skill B" },
  { id: "skill-c", type: "skill", title: "Skill C" },
  { id: "skill-d", type: "skill", title: "Skill D" },
  {
    id: "project-01",
    type: "project",
    title: "Project 01",
    summary: "One line about this project.",
    featured: true,
  },
  {
    id: "project-02",
    type: "project",
    title: "Project 02",
    summary: "One line about this project.",
  },
  {
    id: "project-03",
    type: "project",
    title: "Project 03",
    summary: "One line about this project.",
  },
  {
    id: "research-01",
    type: "research",
    title: "Paper or study 01",
    summary: "One line about this research.",
  },
  { id: "achievement-01", type: "achievement", title: "Award or milestone 01" },
];

export const links: GraphLink[] = [
  { from: "skill-a", to: "project-01" },
  { from: "skill-b", to: "project-01" },
  { from: "skill-b", to: "project-02" },
  { from: "skill-c", to: "project-03" },
  { from: "skill-d", to: "research-01" },
  { from: "project-01", to: "research-01" },
  { from: "project-01", to: "achievement-01" },
];
