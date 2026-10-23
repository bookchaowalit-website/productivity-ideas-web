"use client";

import { useMemo, useState } from "react";
import { EMPTY_DRAFT, SEED, STATUSES, STORAGE_KEY, createIdea, filterIdeas, parseIdeas, pickSelected, removeIdea as removeFromField, signalBars, type IdeaDraft, type Status, type StatusFilter } from "@/lib/ideas";
import { useStoredState } from "@/lib/use-stored-state";

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `idea-${Date.now()}`;
}

function SignalBars({ seed }: { seed: string }) {
  const bars = signalBars(seed);

  return (
    <span className="idea-signal" aria-hidden="true">
      {bars.map((width, index) => (
        <i key={`${seed}-${index}`} style={{ width: `${width}px` }} />
      ))}
    </span>
  );
}

export default function Home() {
  const [ideas, setIdeas] = useStoredState(STORAGE_KEY, SEED, parseIdeas);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(SEED[0]?.id ?? null);
  const [draft, setDraft] = useState<IdeaDraft>(EMPTY_DRAFT);
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => filterIdeas(ideas, statusFilter, query), [ideas, query, statusFilter]);

  const selected = pickSelected(ideas, filtered, selectedId);

  function addIdea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const idea = createIdea(draft, createId(), Date.now());
    if (!idea) {
      setNotice("Give the thought a title before placing it in the field.");
      return;
    }

    setIdeas((current) => [idea, ...current]);
    setSelectedId(idea.id);
    setStatusFilter("All");
    setDraft(EMPTY_DRAFT);
    setNotice("Thought placed in the field.");
  }

  function removeIdea(id: string) {
    const next = removeFromField(ideas, id, selectedId);
    setIdeas(next.ideas);
    setSelectedId(next.selectedId);
    setNotice("Thought removed from this browser.");
  }

  return (
    <main className="idea-field">
      <div className="field-frame">
        <header className="field-header">
          <div className="field-mark">
            <span className="mark-bars" aria-hidden="true"><i /><i /><i /><i /></span>
            <span>IDEA / FIELD</span>
          </div>
          <p>LOCAL NOTEBOOK · {ideas.length.toString().padStart(2, "0")} THOUGHTS</p>
        </header>

        <section className="field-intro" aria-labelledby="page-title">
          <div>
            <h1 id="page-title">Give a loose thought one next move.</h1>
            <p>A local idea instrument for keeping a question visible long enough to shape it, test it, or deliberately park it.</p>
          </div>
          <div className="field-readout">
            <strong>{filtered.length.toString().padStart(2, "0")}</strong>
            <span>VISIBLE<br />SIGNALS</span>
          </div>
        </section>

        <section className="field-console" aria-label="Idea field workspace">
          <div className="capture-bay">
            <p className="section-label">CAPTURE BAY</p>
            <h2>Put the rough version here.</h2>
            <p className="capture-note">No scoring, no fake roadmap. A thought earns its place by getting a useful next sentence.</p>
            <form onSubmit={addIdea} className="capture-form">
              <label>
                <span>Thought title</span>
                <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="What keeps returning?" required />
              </label>
              <label>
                <span>Working note</span>
                <textarea value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="What might be true?" rows={4} />
              </label>
              <label>
                <span>Current signal</span>
                <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Status }))}>
                  {STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <button className="place-button" type="submit">Place in field <span aria-hidden="true">↗</span></button>
            </form>
            <p className="form-notice" role="status" aria-live="polite">{notice}</p>
          </div>

          <div className="field-reading">
            <div className="reading-toolbar">
              <label className="search-field">
                <span>SCAN THE FIELD</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search thoughts" />
              </label>
              <div className="status-filter" role="group" aria-label="Filter thoughts by signal">
                {(["All", ...STATUSES] as const).map((status) => (
                  <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>{status}</button>
                ))}
              </div>
            </div>

            <div className="reading-heading">
              <p className="section-label">FIELD INDEX</p>
              <span>{filtered.length} / {ideas.length} SHOWING</span>
            </div>

            {filtered.length > 0 ? (
              <ul className="idea-list">
                {filtered.map((idea) => (
                  <li key={idea.id}>
                    <button type="button" className={`idea-row${selected?.id === idea.id ? " is-selected" : ""}`} onClick={() => setSelectedId(idea.id)}>
                      <span className="idea-row-topline"><span>{idea.status}</span><time dateTime={new Date(idea.createdAt).toISOString()}>{new Date(idea.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</time></span>
                      <strong>{idea.title}</strong>
                      <span className="idea-row-bottom"><SignalBars seed={idea.title} /><span>{idea.body}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-field"><strong>No signal in this range.</strong><span>Clear the scan or place a new thought in the field.</span></div>
            )}

            {selected && (
              <article className="selected-reading" aria-labelledby="selected-title">
                <div className="selected-rule" aria-hidden="true" />
                <div className="selected-header">
                  <p className="section-label">CURRENT READING</p>
                  <button type="button" className="remove-button" onClick={() => removeIdea(selected.id)}>Remove</button>
                </div>
                <h2 id="selected-title">{selected.title}</h2>
                <p>{selected.body}</p>
                <div className="selected-meta">
                  <span><b>STATE</b>{selected.status}</span>
                  <span><b>RECORDED</b>{new Date(selected.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              </article>
            )}
          </div>
        </section>

        <footer className="field-footer">
          <span>IDEA / FIELD · PRIVATE BY DEFAULT</span>
          <span>State stays in this browser. No account. No pretend intelligence.</span>
        </footer>
      </div>
    </main>
  );
}
