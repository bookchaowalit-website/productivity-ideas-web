import { describe, expect, it } from "vitest";
import { EMPTY_BODY, SEED, createIdea, filterIdeas, parseIdeas, pickSelected, removeIdea, signalBars } from "@/lib/ideas";

describe("parseIdeas", () => {
  it("returns null for missing, corrupt or non-array data so the sample is used", () => {
    expect(parseIdeas(null)).toBeNull();
    expect(parseIdeas("not json")).toBeNull();
    // Regression: a stored object was cast to Idea[] and crashed ideas.filter() on load.
    expect(parseIdeas('{"ideas":[]}')).toBeNull();
  });

  it("keeps valid ideas and drops malformed ones", () => {
    expect(parseIdeas(JSON.stringify([SEED[1], { ...SEED[0], status: "Shipped" }, { id: "x" }]))).toEqual([SEED[1]]);
    expect(parseIdeas("[]")).toEqual([]);
  });
});

describe("filterIdeas and pickSelected", () => {
  it("matches title, note and signal, combined with the signal filter", () => {
    expect(filterIdeas(SEED, "All", " SPREADSHEET ").map((i) => i.id)).toEqual(["decision-trail"]);
    expect(filterIdeas(SEED, "Testing", "").map((i) => i.id)).toEqual(["decision-trail"]);
    expect(filterIdeas(SEED, "Parked", "")).toEqual([]);
  });

  it("falls back to the first visible idea, then the first idea", () => {
    expect(pickSelected(SEED, SEED, "decision-trail")?.id).toBe("decision-trail");
    expect(pickSelected(SEED, [SEED[2]], "gone")?.id).toBe("quiet-onboarding");
    expect(pickSelected(SEED, [], null)?.id).toBe("last-useful-view");
    expect(pickSelected([], [], null)).toBeUndefined();
  });
});

describe("field edits", () => {
  it("creates a trimmed idea with a placeholder note, or nothing for a blank title", () => {
    expect(createIdea({ title: "  Try  ", body: "  ", status: "Parked" }, "n1", 4)).toEqual({ id: "n1", title: "Try", body: EMPTY_BODY, status: "Parked", createdAt: 4 });
    expect(createIdea({ title: "   ", body: "x", status: "Seed" }, "n2", 4)).toBeNull();
  });

  it("moves the selection to the first remaining idea only when the selected one is removed", () => {
    // Regression: the page set the selection from inside the setIdeas updater, reading a stale selectedId.
    expect(removeIdea(SEED, "last-useful-view", "last-useful-view")).toEqual({ ideas: SEED.slice(1), selectedId: "decision-trail" });
    expect(removeIdea(SEED, "quiet-onboarding", "last-useful-view").selectedId).toBe("last-useful-view");
    expect(removeIdea([SEED[0]], SEED[0].id, SEED[0].id)).toEqual({ ideas: [], selectedId: null });
  });

  it("gives each title a stable 22-bar signature of 1-4 px", () => {
    const bars = signalBars("Idea");
    expect(bars).toHaveLength(22);
    expect(bars.every((w) => w >= 1 && w <= 4)).toBe(true);
    expect(signalBars("Idea")).toEqual(bars);
    expect(signalBars("")).toHaveLength(22);
  });
});
