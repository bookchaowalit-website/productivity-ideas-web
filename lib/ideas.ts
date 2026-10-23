// Idea field data and pure logic, shared by the page and the MCP route.

export type Status = "Seed" | "Shaping" | "Testing" | "Parked";
export type StatusFilter = Status | "All";
export type Idea = { id: string; title: string; body: string; status: Status; createdAt: number };
export type IdeaDraft = Pick<Idea, "title" | "body" | "status">;

export const STORAGE_KEY = "idea-field-v2";
export const STATUSES: Status[] = ["Seed", "Shaping", "Testing", "Parked"];
export const EMPTY_DRAFT: IdeaDraft = { title: "", body: "", status: "Seed" };
export const EMPTY_BODY = "No detail yet. The next question can sharpen it.";

// Authored sample thoughts for the portfolio demo.
export const SEED: Idea[] = [
  {
    id: "last-useful-view",
    title: "Make the last useful view easy to return to",
    body: "A small product should remember the moment that helped, not just the account that visited.",
    status: "Shaping",
    createdAt: Date.parse("2026-08-18"),
  },
  {
    id: "decision-trail",
    title: "Export a decision trail without opening a spreadsheet",
    body: "Turn a short experiment into a portable note: question, signal, decision, next move.",
    status: "Testing",
    createdAt: Date.parse("2026-08-15"),
  },
  {
    id: "quiet-onboarding",
    title: "A quieter first run for tools with many possibilities",
    body: "Let a person choose one useful starting point before showing the full surface area.",
    status: "Seed",
    createdAt: Date.parse("2026-08-11"),
  },
];

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

function isIdea(value: unknown): value is Idea {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.body === "string" &&
    isStatus(item.status) &&
    typeof item.createdAt === "number" &&
    Number.isFinite(item.createdAt)
  );
}

/** Parse the stored field. Returns null (use the sample) for missing, corrupt or non-array data. */
export function parseIdeas(raw: string | null): Idea[] | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  return Array.isArray(value) ? value.filter(isIdea) : null;
}

export function filterIdeas(ideas: Idea[], statusFilter: StatusFilter, query: string): Idea[] {
  const needle = query.trim().toLowerCase();
  return ideas.filter(
    (idea) =>
      (statusFilter === "All" || idea.status === statusFilter) &&
      (!needle || `${idea.title} ${idea.body} ${idea.status}`.toLowerCase().includes(needle)),
  );
}

/** The reading panel shows the chosen idea, else the first visible one, else the first idea. */
export function pickSelected(ideas: Idea[], visible: Idea[], selectedId: string | null): Idea | undefined {
  return ideas.find((idea) => idea.id === selectedId) ?? visible[0] ?? ideas[0];
}

/** Build a new idea from the form, or null when the title is blank. */
export function createIdea(draft: IdeaDraft, id: string, now: number): Idea | null {
  const title = draft.title.trim();
  if (!title) return null;
  return { id, title, body: draft.body.trim() || EMPTY_BODY, status: draft.status, createdAt: now };
}

/**
 * Remove an idea and say what the reading panel should show next: the first remaining idea when the removed one was
 * selected, otherwise the current selection.
 */
export function removeIdea(ideas: Idea[], id: string, selectedId: string | null) {
  const remaining = ideas.filter((idea) => idea.id !== id);
  return { ideas: remaining, selectedId: selectedId === id ? (remaining[0]?.id ?? null) : selectedId };
}

/** 22 bar widths (1-4 px) derived from the title, so each idea gets a stable signature. */
export function signalBars(seed: string): number[] {
  return Array.from({ length: 22 }, (_, index) => {
    const code = seed.charCodeAt(index % Math.max(seed.length, 1)) || 47;
    return 1 + ((code + index * 7) % 4);
  });
}
