/**
 * Site-wide identity. Edit the text here; nothing else needs to change.
 * Everything marked PLACEHOLDER is replaced when the resume arrives.
 */
export const site = {
  name: "Jinay Shah",
  initials: "JS",
  /** PLACEHOLDER: one quiet line under the name, in the form "Role · Field · Focus". */
  roleLine: "Role · Field · Focus",
  tagline: "From stillness, creation.",
  description:
    "The portfolio of Jinay Shah: a journey from the soul to the mind, and from the mind to creation.",
  /** PLACEHOLDER: contact details and links shown in the Return scene. */
  email: "hello@example.com",
  resumeFile: "/resume.pdf",
  links: [
    { label: "GitHub", href: "https://github.com/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
  ],
} as const;
