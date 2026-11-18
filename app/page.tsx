"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, Pill, PlusIcon, type Tone } from "@/components/app-shell";
import { EMPTY_DRAFT, SEED, STATUSES, STORAGE_KEY, createIdea, filterIdeas, formatCreated, parseIdeas, restoreIdea, type Idea, type IdeaDraft, type Status, type StatusFilter } from "@/lib/ideas";
import { useStoredState } from "@/lib/use-stored-state";

type RemovedEntry = { idea: Idea; beforeId: string | null };
type RemovedBatch = { items: RemovedEntry[]; viaKeyboard: boolean };
const removedLabel = (items: RemovedEntry[]) => (items.length === 1 ? `Removed “${items[0].idea.title}”` : `Removed ${items.length} ideas`);

const TONE: Record<Status, Tone> = { Seed: "grey", Shaping: "amber", Testing: "green", Parked: "grey" };

// randomUUID only exists in secure contexts (HTTPS/localhost) and newer browsers.
function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `idea-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Home() {
  const [ideas, setIdeas] = useStoredState(STORAGE_KEY, SEED, parseIdeas);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<IdeaDraft>(EMPTY_DRAFT);
  // Every removal still inside the Undo window: one Undo puts them all back where they were.
  const [removed, setRemovedState] = useState<RemovedBatch | null>(null);
  // The latest batch, so two removals before a re-render still both land in it.
  const removedRef = useRef<RemovedBatch | null>(null);
  const setRemoved = (batch: RemovedBatch | null) => { removedRef.current = batch; setRemovedState(batch); };
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const wasComposing = useRef(false);
  const visible = useMemo(() => filterIdeas(ideas, filter, query), [ideas, filter, query]);
  const countOf = (status: StatusFilter) => (status === "All" ? ideas.length : ideas.filter((idea) => idea.status === status).length);

  // Opening the composer focuses its title; closing it returns focus to New idea (or the title, if
  // the toast closes while the composer is open).
  useEffect(() => {
    if (composing) titleRef.current?.focus();
    else if (wasComposing.current) newRef.current?.focus();
    wasComposing.current = composing;
  }, [composing]);
  useEffect(() => { if (removed?.viaKeyboard) undoRef.current?.focus(); }, [removed]);
  // The toast closes 6 s after the latest removal (each removal restarts it), but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => { removedRef.current = null; setRemovedState(null); }, 6000);
    return () => window.clearTimeout(timer);
  }, [removed, toastFocused]);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const idea = createIdea(draft, createId(), Date.now());
    if (!idea) return;
    setIdeas((current) => [idea, ...current]);
    // Show the new idea: its own list, and no search that might hide it.
    if (filter !== "All" && filter !== idea.status) setFilter(idea.status);
    setQuery("");
    setAnnouncement(`Added “${idea.title}”.`);
    setDraft(EMPTY_DRAFT);
    setComposing(false);
  }
  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }
  function remove(idea: Idea, viaKeyboard: boolean) {
    // Read the idea and its neighbour from the stored list inside the same update, not from this render.
    let entry: RemovedEntry | undefined;
    setIdeas((current) => {
      const index = current.findIndex((item) => item.id === idea.id);
      if (index < 0) return current;
      entry = { idea: current[index], beforeId: current[index + 1]?.id ?? null };
      return current.filter((item) => item.id !== idea.id);
    });
    if (!entry) return;
    const items = [...(removedRef.current?.items ?? []), entry];
    setRemoved({ items, viaKeyboard });
    setAnnouncement(`${removedLabel(items)}. Undo is available for a few seconds.`);
  }
  function closeToast() {
    setRemoved(null);
    setToastFocused(false);
    (newRef.current ?? titleRef.current)?.focus();
  }
  function undo() {
    const items = removedRef.current?.items;
    if (!items?.length) return;
    // Latest removal first, so each idea goes back before the row that followed it at the time.
    setIdeas((current) => items.reduceRight((list, { idea, beforeId }) => restoreIdea(list, idea, beforeId), current));
    setAnnouncement(items.length === 1 ? `Restored “${items[0].idea.title}”.` : `Restored ${items.length} ideas.`);
    closeToast();
  }

  const title = filter === "All" ? "All ideas" : filter;
  const lists: { value: StatusFilter; tone?: Tone }[] = [{ value: "All" }, ...STATUSES.map((status) => ({ value: status, tone: TONE[status] }))];

  return (
    <div className="as">
      <a className="as-skip" href="#main">Skip to content</a>
      <AppTop name="Ideas" tagline="Give a loose thought its next move" />

      <div className="as-body">
        <aside className="as-side" aria-label="Lists">
          <h2>Lists</h2>
          <ul className="as-lists">
            {lists.map(({ value, tone }) => (
              <ListButton key={value} label={value === "All" ? "All ideas" : value} count={countOf(value)} tone={tone} current={filter === value} onSelect={() => setFilter(value)} />
            ))}
          </ul>
        </aside>

        <main id="main" className="as-main">
          <div className="as-head">
            <div>
              <h1>{title}</h1>
              <p aria-live="polite">{visible.length} {visible.length === 1 ? "idea" : "ideas"}{query.trim() ? ` matching “${query.trim()}”` : ""}</p>
            </div>
            <div className="as-tools">
              <label className="as-search">
                <span className="as-sr">Search ideas</span>
                <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
              </label>
              {composing ? null : <button ref={newRef} type="button" className="as-button" onClick={() => setComposing(true)}><PlusIcon />New idea</button>}
            </div>
          </div>

          {composing ? (
            <form className="as-composer" onSubmit={add} aria-label="New idea">
              <label className="as-field">Idea
                <input ref={titleRef} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="What keeps coming back?" autoComplete="off" />
              </label>
              <label className="as-field">Note
                <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="What might be true? What would you test first?" />
              </label>
              <div className="as-composer-foot">
                <div className="as-segmented-wrap">
                  <span id="stage-label">Stage</span>
                  <div className="as-segmented" role="group" aria-labelledby="stage-label">
                    {STATUSES.map((status) => (
                      <button key={status} type="button" aria-pressed={draft.status === status} onClick={() => setDraft({ ...draft, status })}>{status}</button>
                    ))}
                  </div>
                </div>
                <div className="as-composer-actions">
                  <button type="button" className="as-plain" onClick={() => { setComposing(false); setDraft(EMPTY_DRAFT); }}>Cancel</button>
                  <button type="submit" className="as-button" disabled={!draft.title.trim()}>Add</button>
                </div>
              </div>
            </form>
          ) : null}

          {visible.length ? (
            <ul className="as-list" aria-label={title}>
              {visible.map((idea) => (
                <li className="as-row" key={idea.id}>
                  <div>
                    <h3>{idea.title}</h3>
                    <p>{idea.body}</p>
                    <p className="as-row-meta"><time dateTime={new Date(idea.createdAt).toISOString()}>{formatCreated(idea.createdAt)}</time></p>
                  </div>
                  <Pill tone={TONE[idea.status]}>{idea.status}</Pill>
                  <button type="button" className="as-plain as-danger" aria-label={`Remove ${idea.title}`} onClick={(event) => remove(idea, event.detail === 0)}>Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="as-list as-empty">
              {query.trim() ? (
                <>
                  <strong>Nothing matches</strong>
                  No idea in {filter === "All" ? "your lists" : title} mentions “{query.trim()}”.
                  <div style={{ marginTop: 8 }}><button type="button" className="as-plain" onClick={clearSearch}>Clear search</button></div>
                </>
              ) : ideas.length === 0 ? (
                <><strong>No ideas yet</strong>Press New idea to write the first one down.</>
              ) : (
                <><strong>This list is empty</strong>No ideas are at the {title} stage yet. Press New idea and pick {title} as the stage to add one.</>
              )}
            </div>
          )}

          <p className="as-note">Saved in this browser only. No account, no scoring.</p>
        </main>
      </div>

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {removed ? (
        <div
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") closeToast(); }}
        >
          <span>{removedLabel(removed.items)}</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo} aria-label={removed.items.length === 1 ? "Undo remove" : `Undo remove of ${removed.items.length} ideas`}>Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/productivity-ideas-web" />
    </div>
  );
}
