import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readStored, resetStoredCache, subscribeStored, writeStored } from "@/lib/use-stored-state";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

const parseNumbers = (raw: string | null) => {
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  return Array.isArray(value) && value.every((n) => typeof n === "number") ? (value as number[]) : null;
};

describe("stored state", () => {
  beforeEach(() => resetStoredCache());
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to the initial value when nothing is stored", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    expect(readStored("k", [1], parseNumbers)).toEqual([1]);
  });

  it("falls back to the initial value for corrupt JSON or the wrong shape", () => {
    vi.stubGlobal("localStorage", fakeStorage({ a: "{not json", b: '{"x":1}' }));
    expect(readStored("a", [1], parseNumbers)).toEqual([1]);
    expect(readStored("b", [2], parseNumbers)).toEqual([2]);
  });

  it("reads a valid stored value and caches it", () => {
    const store = fakeStorage({ k: "[3,4]" });
    vi.stubGlobal("localStorage", store);
    expect(readStored("k", [], parseNumbers)).toEqual([3, 4]);
    store.data.set("k", "[9]");
    expect(readStored("k", [], parseNumbers)).toEqual([3, 4]);
  });

  it("writes JSON, updates the cache and notifies subscribers", () => {
    const store = fakeStorage();
    vi.stubGlobal("localStorage", store);
    const listener = vi.fn();
    const unsubscribe = subscribeStored("k", listener);
    writeStored("k", [5]);
    expect(store.data.get("k")).toBe("[5]");
    expect(readStored("k", [], parseNumbers)).toEqual([5]);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    writeStored("k", [6]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps working when storage is missing or throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    });
    expect(readStored("k", [7], parseNumbers)).toEqual([7]);
    expect(() => writeStored("k", [8])).not.toThrow();
    expect(readStored("k", [], parseNumbers)).toEqual([8]);
  });
});
