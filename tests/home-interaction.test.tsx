// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { resetStoredCache } from "@/lib/use-stored-state";

// Mounted tests for ideas on the App shell: composer, lists, search, remove, undo and focus.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const rows = () => [...host.querySelectorAll(".as-row h3")].map((h) => h.textContent);
const press = (el: Element, detail = 0) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  localStorage.clear();
  resetStoredCache();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("composer", () => {
  it("opens focused, keeps Add disabled without a title, adds on top and returns focus", () => {
    press(button("New idea"));
    expect(document.activeElement).toBe($(".as-composer input"));
    expect(button("Add", $(".as-composer")!).disabled).toBe(true);
    type($<HTMLInputElement>(".as-composer input")!, "Weekly review ritual");
    type($<HTMLTextAreaElement>(".as-composer textarea")!, "Ten minutes on Fridays");
    press(button("Testing", $(".as-composer")!));
    press(button("Add", $(".as-composer")!));
    expect(rows()[0]).toBe("Weekly review ritual");
    expect(document.activeElement?.textContent).toContain("New idea");
    expect(JSON.parse(localStorage.getItem("idea-field-v2")!)[0]).toMatchObject({ title: "Weekly review ritual", status: "Testing" });
  });

  it("an empty note gets the default text, and adding from another list switches to the new idea's list", () => {
    press(button("Parked", $(".as-side")!));
    press(button("New idea"));
    type($<HTMLInputElement>(".as-composer input")!, "Bare thought");
    press(button("Add", $(".as-composer")!));
    expect($("h1")!.textContent).toBe("Seed");
    expect(rows()).toContain("Bare thought");
    expect(host.textContent).toContain("No detail yet.");
  });

  it("still adds when crypto.randomUUID is missing (plain HTTP, older browsers)", () => {
    vi.stubGlobal("crypto", {});
    try {
      press(button("New idea"));
      type($<HTMLInputElement>(".as-composer input")!, "No secure context");
      press(button("Add", $(".as-composer")!));
      expect(rows()[0]).toBe("No secure context");
      expect(JSON.parse(localStorage.getItem("idea-field-v2")!)[0].id).toMatch(/^idea-\d+-[a-z0-9]+$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("Cancel closes without adding and returns focus", () => {
    press(button("New idea"));
    type($<HTMLInputElement>(".as-composer input")!, "Never mind");
    press(button("Cancel"));
    expect(rows()).not.toContain("Never mind");
    expect(document.activeElement?.textContent).toContain("New idea");
  });
});

describe("lists and search", () => {
  it("filters by list and search, with empty states", () => {
    press(button("Shaping", $(".as-side")!));
    expect(rows()).toEqual(["Make the last useful view easy to return to"]);
    press(button("All ideas", $(".as-side")!));
    type($<HTMLInputElement>(".as-search input")!, "zzz");
    expect(host.textContent).toContain("Nothing matches");
    expect(host.textContent).toContain("mentions “zzz”");
    const search = $<HTMLInputElement>(".as-search input")!;
    press(button("Clear search"));
    expect(search.value).toBe("");
    expect(document.activeElement).toBe(search);
    expect(rows()).toHaveLength(3);
    // An empty list without a search says the list is empty, never "matches your search".
    press(button("Parked", $(".as-side")!));
    expect(host.textContent).toContain("This list is empty");
    expect(host.textContent).not.toContain("search");
    expect(host.querySelector(".as-empty button")).toBeNull();
    press(button("All ideas", $(".as-side")!));
    for (const title of ["Make the last useful view easy to return to", "Export a decision trail without opening a spreadsheet", "A quieter first run for tools with many possibilities"]) press($(`[aria-label="Remove ${title}"]`)!, 1);
    expect(host.textContent).toContain("No ideas yet");
  });
});

describe("remove and undo", () => {
  it("keyboard removal focuses Undo; Undo restores in place and focuses the restored row", () => {
    press($('[aria-label="Remove Export a decision trail without opening a spreadsheet"]')!, 0);
    expect(document.activeElement?.textContent).toBe("Undo");
    press(button("Undo"));
    expect(rows()[1]).toBe("Export a decision trail without opening a spreadsheet");
    expect(document.activeElement).toBe($('[aria-label="Remove Export a decision trail without opening a spreadsheet"]'));
  });

  it("Escape puts focus on the row after the removed one, else the one before, else New idea", () => {
    const before = rows();
    press($(`[aria-label="Remove ${before[1]}"]`)!, 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement).toBe($(`[aria-label="Remove ${before[2]}"]`));
    const last = rows().at(-1)!;
    const prev = rows().at(-2)!;
    press($(`[aria-label="Remove ${last}"]`)!, 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement).toBe($(`[aria-label="Remove ${prev}"]`));
    // Nothing left to land on: New idea.
    for (const title of rows()) press($(`[aria-label="Remove ${title}"]`)!, 0);
    expect(rows()).toHaveLength(0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement?.textContent).toContain("New idea");
  });

  it("Escape dismisses; the toast waits while focused and closes six seconds after focus leaves", () => {
    press($('[aria-label="Remove Export a decision trail without opening a spreadsheet"]')!, 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect($(".as-toast")).toBeNull();
    vi.useFakeTimers();
    press($('[aria-label="Remove A quieter first run for tools with many possibilities"]')!, 0);
    act(() => { vi.advanceTimersByTime(7000); });
    expect($(".as-toast")).not.toBeNull();
    act(() => { button("New idea").focus(); });
    act(() => { vi.advanceTimersByTime(6000); });
    expect($(".as-toast")).toBeNull();
  });

  it("dismissing the toast with no row left while the composer is open focuses the composer", () => {
    press(button("New idea"));
    for (const title of rows()) press($(`[aria-label="Remove ${title}"]`)!, 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement).toBe($(".as-composer input"));
  });

  it("removals inside the Undo window form one batch; Undo restores all in their places", () => {
    vi.useFakeTimers();
    const before = rows();
    press($(`[aria-label="Remove ${before[1]}"]`)!, 0);
    act(() => { vi.advanceTimersByTime(4000); });
    press($(`[aria-label="Remove ${before[0]}"]`)!, 0);
    expect(rows()).toEqual(before.slice(2));
    expect($(".as-toast span")!.textContent).toBe("Removed 2 ideas");
    expect(host.querySelector('[role="status"]')!.textContent).toContain("Removed 2 ideas");
    const undo = button("Undo");
    expect(undo.getAttribute("aria-label")).toBe("Undo remove of 2 ideas");
    // The second removal restarted the timer: 4 s + 4 s after the first, it is still open.
    act(() => { button("New idea").focus(); });
    act(() => { vi.advanceTimersByTime(4000); });
    expect($(".as-toast")).not.toBeNull();
    press(button("Undo"));
    expect(rows()).toEqual(before);
    expect(host.querySelector('[role="status"]')!.textContent).toBe("Restored 2 ideas.");
    act(() => { vi.advanceTimersByTime(6000); });
    expect($(".as-toast")).toBeNull();
  });

  it("one removal says its title, and Undo's name starts with Undo", () => {
    const first = rows()[0];
    press($(`[aria-label="Remove ${first}"]`)!, 0);
    expect($(".as-toast span")!.textContent).toBe(`Removed “${first}”`);
    expect(button("Undo").getAttribute("aria-label")).toBe("Undo remove");
  });
});

describe("row note preview", () => {
  it("a note with line breaks shows one line, and Show more / Show less toggle the full note", () => {
    act(() => { button("New idea").click(); });
    type($<HTMLInputElement>(".as-composer input")!, "Long one");
    type($<HTMLTextAreaElement>(".as-composer textarea")!, "First line\nSecond line\nThird line");
    act(() => { button("Add").click(); });
    const row = $('.as-row[data-idea]')!;
    const detail = row.querySelector<HTMLElement>(".as-row-detail")!;
    expect(detail.textContent).toBe("First line\nSecond line\nThird line");
    expect(detail.dataset.expanded).toBeUndefined();
    const more = button("Show more", row);
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(more.getAttribute("aria-controls")).toBe(detail.id);
    act(() => { more.click(); });
    expect(detail.dataset.expanded).toBe("true");
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(more.textContent).toBe("Show less");
    act(() => { more.click(); });
    expect(detail.dataset.expanded).toBeUndefined();
    expect(more.textContent).toBe("Show more");
  });

  it("a short single-line note has no toggle", () => {
    expect(host.querySelectorAll(".as-row-more")).toHaveLength(0);
    expect(host.querySelectorAll(".as-row-detail").length).toBeGreaterThan(0);
  });

  it("a one-line note that is clipped at the row width gets Show more (measured on resize)", () => {
    act(() => root.unmount());
    const callbacks: (() => void)[] = [];
    vi.stubGlobal("ResizeObserver", class { constructor(cb: () => void) { callbacks.push(cb); } observe() {} disconnect() {} });
    const width = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(500);
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
    try {
      root = createRoot(host);
      act(() => root.render(<Home />));
      act(() => { callbacks.forEach((cb) => cb()); });
      const first = $('.as-row[data-idea]')!;
      const more = button("Show more", first);
      act(() => { more.click(); });
      // Expanded, nothing is clipped; but the measurement is skipped so Show less stays.
      width.mockReturnValue(200);
      act(() => { callbacks.forEach((cb) => cb()); });
      expect(button("Show less", first)).toBeTruthy();
    } finally {
      width.mockRestore();
      client.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("the CSS keeps the row note to one line until expanded", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(`${process.cwd()}/app/app-shell.css`, "utf8");
    expect(css).toContain(".as-row .as-row-detail { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }");
    expect(css).toContain('.as-row .as-row-detail[data-expanded="true"] { white-space: pre-line; }');
  });
});

describe("row note preview after web fonts load", () => {
  it("re-measures on document.fonts.ready and on loadingdone, so a note clipped by the late font gets Show more", async () => {
    act(() => root.unmount());
    const listeners: (() => void)[] = [];
    let resolveReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
    const fonts = { ready, addEventListener: (_: string, cb: () => void) => listeners.push(cb), removeEventListener: vi.fn() };
    const original = Object.getOwnPropertyDescriptor(document, "fonts");
    Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
    // No ResizeObserver: only the font hooks can measure.
    vi.stubGlobal("ResizeObserver", undefined);
    const width = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(100);
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
    try {
      root = createRoot(host);
      act(() => root.render(<Home />));
      await act(async () => { resolveReady(); await ready; });
      expect(host.querySelectorAll(".as-row-more")).toHaveLength(0);
      // The web font lands and the text now overflows the same box.
      width.mockReturnValue(500);
      act(() => { listeners.forEach((cb) => cb()); });
      expect(host.querySelectorAll(".as-row-more").length).toBeGreaterThan(0);
      act(() => root.unmount());
      expect(fonts.removeEventListener).toHaveBeenCalled();
      root = createRoot(host);
    } finally {
      width.mockRestore();
      client.mockRestore();
      vi.unstubAllGlobals();
      if (original) Object.defineProperty(document, "fonts", original);
      else delete (document as { fonts?: unknown }).fonts;
    }
  });
});

describe("stage control in forced colors", () => {
  it("marks the chosen stage with Highlight colours and an edge, after the normal rules", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(`${process.cwd()}/app/app-shell.css`, "utf8");
    const normal = css.indexOf('.as-segmented button[aria-pressed="true"] { background: var(--as-surface)');
    const forced = css.indexOf("@media (forced-colors: active)");
    expect(normal).toBeGreaterThan(-1);
    expect(forced).toBeGreaterThan(normal);
    const block = css.slice(forced, css.indexOf("}\n}", forced) + 3);
    expect(block).toContain('.as-segmented button[aria-pressed="true"] { forced-color-adjust: none; background: Highlight; color: HighlightText; border: 2px solid Highlight; }');
    expect(block).toContain(".as-segmented button { border: 1px solid ButtonText; }");
  });
});

describe("stage control in the normal themes", () => {
  it("the chosen stage has a 2px --as-fg ring at 3:1 or more against the track and its fill, light and dark", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(`${process.cwd()}/app/app-shell.css`, "utf8");
    expect(css).toContain('.as-segmented button[aria-pressed="true"] { background: var(--as-surface); font-weight: 600; box-shadow: inset 0 0 0 2px var(--as-fg), 0 1px 3px rgb(0 0 0 / 12%); }');
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const dark = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
    const token = (source: string, name: string) => source.match(new RegExp(`--as-${name}:\\s*(#[0-9a-fA-F]{6})`))![1];
    for (const theme of [css, dark]) {
      const fg = token(theme, "fg");
      expect(ratio(fg, token(theme, "selected"))).toBeGreaterThanOrEqual(3);
      expect(ratio(fg, token(theme, "surface"))).toBeGreaterThanOrEqual(3);
    }
  });
});
