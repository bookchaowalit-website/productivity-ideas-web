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
  it("keyboard removal focuses Undo; Undo restores in place and focuses New idea", () => {
    press($('[aria-label="Remove Export a decision trail without opening a spreadsheet"]')!, 0);
    expect(document.activeElement?.textContent).toBe("Undo");
    press(button("Undo"));
    expect(rows()[1]).toBe("Export a decision trail without opening a spreadsheet");
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

  it("closing the toast while the composer is open focuses the composer", () => {
    press($('[aria-label="Remove Export a decision trail without opening a spreadsheet"]')!, 0);
    press(button("New idea"));
    press(button("Undo"));
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
