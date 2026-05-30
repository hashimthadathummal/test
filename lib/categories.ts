export const CATEGORIES = [
  "candidate",
  "program",
  "registration",
  "result",
  "report",
  "billing",
  "template",
  "AI",
  "content",
  "schedule",
  "website",
  "notification",
  "dashboards",
  "other"
] as const;

export type IssueCategory = (typeof CATEGORIES)[number];

export function isIssueCategory(value: unknown): value is IssueCategory {
  return typeof value === "string" && CATEGORIES.includes(value as IssueCategory);
}
