"use client";

import { useCallback, useSyncExternalStore } from "react";

// State mirrored to localStorage through useSyncExternalStore: the server render and the first client
// render use `initial` (so markup matches), then the stored value is read once per key and cached.
// `parse` must return null for missing or invalid data; the initial value is used then.

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();
const cache = new Map<string, unknown>();

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined; // blocked storage (privacy mode) throws on access
  }
}

export function readStored<T>(key: string, initial: T, parse: (raw: string | null) => T | null): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value: T | null = null;
  try {
    value = parse(storage()?.getItem(key) ?? null);
  } catch {
    value = null;
  }
  const result = value ?? initial;
  cache.set(key, result);
  return result;
}

export function writeStored<T>(key: string, value: T) {
  cache.set(key, value);
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the in-memory value still works for this visit.
  }
  listeners.get(key)?.forEach((listener) => listener());
}

export function subscribeStored(key: string, listener: Listener) {
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
  };
}

/** Test helper: forget cached values so the next read goes back to storage. */
export function resetStoredCache() {
  cache.clear();
}

export function useStoredState<T>(key: string, initial: T, parse: (raw: string | null) => T | null) {
  const subscribe = useCallback((listener: Listener) => subscribeStored(key, listener), [key]);
  const value = useSyncExternalStore(subscribe, () => readStored(key, initial, parse), () => initial);
  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = readStored(key, initial, parse);
      writeStored(key, typeof next === "function" ? (next as (previous: T) => T)(previous) : next);
    },
    [key, initial, parse],
  );
  return [value, setValue] as const;
}
