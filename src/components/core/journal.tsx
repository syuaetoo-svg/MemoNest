"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRemaining } from "@/lib/core/use-remaining";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  useCoreApi,
  messageOf,
  useResource,
  useUnsavedGuard,
} from "@/lib/core/client";
import {
  entryInput,
  entryTitle,
  localDate,
  type Entry,
  type EntryDraft,
} from "@/lib/core/contracts";
import { Card, EmptyState } from "@/components/ui";
import { JournalCover } from "@/components/journal-cover";
import { Button, Dialog, Feedback, fieldClass } from "./ui";
import { MemoryPermission } from "./memories";
import { JournalReview } from "./journal-review";
import { BookOpen, Undo2, History, PenLine, X, Trash2, Save, Eye, RefreshCw, CalendarDays, Search, ArrowDown, ArrowLeft, ArrowUpRight, LockKeyhole, List, LayoutGrid } from "lucide-react";

export function EntryEditor({
  initial,
  initialDraft,
  onSaved,
}: {
  initial?: Entry;
  initialDraft?: EntryDraft;
  onSaved?: (entry: Entry) => void;
}) {
  const api = useCoreApi();
  const [baseline, setBaseline] = useState({
    title: initial?.title || initialDraft?.title || "",
    body: initial?.body || initialDraft?.body || "",
    eventDate: initial?.event_date || initialDraft?.eventDate || "",
  });
  const [draft, setDraft] = useState<EntryDraft>(baseline),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<Entry | null>(null),
    [deleteOpen, setDeleteOpen] = useState(false),
    [undone, setUndone] = useState(false);
  useEffect(() => {
    if (initial || initialDraft) return;
    // Browser local date after hydration avoids a UTC/server date mismatch.
    const timer = setTimeout(() => {
      const date = localDate();
      setBaseline((value) => ({ ...value, eventDate: date }));
      setDraft((value) => ({ ...value, eventDate: value.eventDate || date }));
    }, 0);
    return () => clearTimeout(timer);
  }, [initial, initialDraft]);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const remaining = useRemaining(saved?.undo_until || null);
  const dirty =
    !saved &&
    (Boolean(initialDraft) || draft.title !== baseline.title ||
      draft.body !== baseline.body ||
      draft.eventDate !== baseline.eventDate);
  useUnsavedGuard(dirty);
  function change(field: keyof EntryDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setPreview(false);
    setError("");
  }
  function prepare(event: FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = entryInput.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setDraft(parsed.data);
    setPreview(true);
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      let result: { entry: Entry };
      if (initial) {
        result = await api(`/api/journal-entries/${initial.id}`, "PATCH", {
          ...draft,
          expectedVersion: initial.version,
        });
      } else {
        const fingerprint = JSON.stringify(draft);
        if (request.current?.fingerprint !== fingerprint)
          request.current = { fingerprint, id: crypto.randomUUID() };
        result = await api("/api/journal-entries", "POST", {
          ...draft,
          requestId: request.current!.id,
        });
      }
      setSaved(result.entry);
      onSaved?.(result.entry);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function undo() {
    if (!saved) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/journal-entries/${saved.id}`, "DELETE", {
        expectedVersion: saved.version,
      });
      setUndone(true);
      setDeleteOpen(false);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  if (saved)
    return (
      <div className="space-y-5">
        <Feedback
          message={
            undone
              ? "Entry deleted. It no longer appears in your timeline."
              : initial
                ? "Changes saved. Memories based on the old version are no longer active. New content has not been shared."
                : "Saved privately. Not shared with Xiaoqi."
          }
        />
        <Feedback message={error} error />
        {!undone && (
          <Card>
            <p className="text-sm text-muted">{saved.event_date} · Private entry</p>
            <h2 className="my-4 text-xl font-semibold">{entryTitle(saved)}</h2>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {saved.body}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/journal/${saved.id}`} className="primary-link">
                <BookOpen size={16} aria-hidden="true"/>
                View entry
              </Link>
              {!initial && remaining !== null && remaining > 0 && (
                <Button tone="secondary" onClick={() => setDeleteOpen(true)}>
                  <Undo2 size={16} aria-hidden="true"/>
                  Undo save ({remaining}s)
                </Button>
              )}
            </div>
          </Card>
        )}
        <Link href="/memories" className="primary-link">
          <History size={16} aria-hidden="true"/>
          Back to your timeline
        </Link>
        {!initial && (
          <Button
            tone="secondary"
            onClick={() => {
              setSaved(null);
              const fresh = { title: "", body: "", eventDate: localDate() };
              setBaseline(fresh);
              setDraft(fresh);
              setPreview(false);
              setUndone(false);
              request.current = null;
            }}
          >
            Write another entry
            <PenLine size={16} aria-hidden="true"/>
          </Button>
        )}
        <Dialog
          open={deleteOpen}
          title="Undo this save?"
          onClose={() => {
            if (!busy) setDeleteOpen(false);
          }}
        >
          <p className="mb-5 text-sm leading-7">
            This deletes the entry you just saved and cannot be undone. Cancel to keep it.
          </p>
          <div className="flex gap-3">
            <Button
              tone="secondary"
              disabled={busy}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
              <X size={16} aria-hidden="true"/>
            </Button>
            <Button tone="danger" disabled={busy} onClick={undo}>
              <Trash2 size={16} aria-hidden="true"/>
              {busy ? "Deleting…" : "Undo & delete"}
            </Button>
          </div>
        </Dialog>
      </div>
    );
  return (
    <Card className="journal-canvas">
      <p className="eyebrow mb-4">A MOMENT TO KEEP</p>
      <h2 className="mb-5 text-xl font-semibold">
        {initial ? "Edit entry" : "A new entry"}
      </h2>
      <form onSubmit={prepare} className="space-y-5">
        <fieldset disabled={busy || preview} className="space-y-5">
          <div>
            <label htmlFor="journal-title" className="mb-2 block text-sm">
              <PenLine size={15} className="mr-2 inline" aria-hidden="true"/>
              Title (optional)
            </label>
            <input
              id="journal-title"
              className={fieldClass}
              value={draft.title}
              maxLength={120}
              onChange={(e) => change("title", e.target.value)}
              placeholder="A little sunset on the way home"
            />
          </div>
          <div>
            <label htmlFor="journal-date" className="mb-2 block text-sm">
              <CalendarDays size={15} className="mr-2 inline" aria-hidden="true"/>
              Date of your moment
            </label>
            <input
              id="journal-date"
              className={fieldClass}
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              required
              value={draft.eventDate}
              onChange={(e) => change("eventDate", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="journal-body" className="mb-2 block text-sm">
              What happened? (required)
            </label>
            <textarea
              id="journal-body"
              className={fieldClass}
              rows={7}
              required
              maxLength={10000}
              value={draft.body}
              onChange={(e) => change("body", e.target.value)}
              placeholder="Just a little moment is enough."
            />
          </div>
        </fieldset>
        <p className="text-sm leading-7 text-muted">
          <LockKeyhole size={15} className="mr-2 inline" aria-hidden="true"/>
          Saved to your private journal only. It is not automatically shared with AI.
          {initial && "Editing withdraws memory permissions based on the old version."}
        </p>
        <Feedback message={error} error />
        {preview ? (
          <div className="space-y-4 rounded-2xl bg-paper p-4">
            <h3 className="font-semibold">Review your entry</h3>
            <p className="text-sm">
              {draft.eventDate} · {draft.title || "Untitled moment"}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {draft.body}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                tone="secondary"
                disabled={busy}
                onClick={() => {
                  setPreview(false);
                  setError("");
                }}
              >
                Back to editing
                <PenLine size={16} aria-hidden="true"/>
              </Button>
              <Button type="button" disabled={busy} onClick={save}>
                <Save size={16} aria-hidden="true"/>
                {busy
                  ? "Saving…"
                  : initial
                    ? "Save changes"
                    : "Save privately"}
              </Button>
            </div>
            {initial && (
              <Link
                className="icon-link text-sm underline"
                href={`/journal/${initial.id}`}
              >
                Reload latest entry (discard this draft)
                <RefreshCw size={16} aria-hidden="true"/>
              </Link>
            )}
          </div>
        ) : (
          <Button type="submit"><Eye size={16} aria-hidden="true"/>Preview entry</Button>
        )}
      </form>
    </Card>
  );
}
export function JournalTimeline({ initialQuery = "", presentation = "default" }: { initialQuery?: string; presentation?: "default" | "overview" } = {}) {
  const api = useCoreApi();
  const overview = presentation === "overview";
  const [view, setView] = useState<"list" | "grid">("list");
  const [period, setPeriod] = useState<"all" | "week">("all");
  const pageGeneration = useRef(0);
  const [query, setQuery] = useState(initialQuery),
    [activeQuery, setActiveQuery] = useState(initialQuery),
    [extra, setExtra] = useState<Entry[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loadingMore, setLoadingMore] = useState(false),
    [moreError, setMoreError] = useState("");
  const { data, error, loading, refresh } = useResource<{
    entries: Entry[];
    nextCursor: string | null;
  }>(`/api/journal-entries?q=${encodeURIComponent(activeQuery)}`);
  useEffect(() => {
    if (!overview) return;
    const update = () => {
      pageGeneration.current++;
      setExtra([]); setCursor(null); setLoadingMore(false); setMoreError("");
      void refresh();
    };
    window.addEventListener("memonest:entries-changed", update);
    return () => window.removeEventListener("memonest:entries-changed", update);
  }, [overview, refresh]);
  async function more() {
    const next = cursor || data?.nextCursor;
    if (!next) return;
    const generation = ++pageGeneration.current;
    setLoadingMore(true);
    setMoreError("");
    try {
      const result = await api<{ entries: Entry[]; nextCursor: string | null }>(
        `/api/journal-entries?q=${encodeURIComponent(activeQuery)}&cursor=${encodeURIComponent(next)}`,
      );
      if (generation !== pageGeneration.current) return;
      setExtra((rows) => [...rows, ...result.entries]);
      setCursor(result.nextCursor || "DONE");
    } catch (e) {
      if (generation === pageGeneration.current) setMoreError(messageOf(e));
    } finally {
      if (generation === pageGeneration.current) setLoadingMore(false);
    }
  }
  function resetPages() {
    // Search, clear and retry invalidate any in-flight page for the old results.
    pageGeneration.current++;
    setExtra([]);
    setCursor(null);
    setLoadingMore(false);
    setMoreError("");
  }
  function search(event: FormEvent) {
    event.preventDefault();
    resetPages();
    setActiveQuery(query.trim());
  }
  const entries = data ? [...data.entries, ...extra] : [];
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const visibleEntries = overview && period === "week" ? entries.filter(entry => new Date(`${entry.event_date}T12:00:00`) >= monday && entry.event_date <= localDate()) : entries;
  return (
    <Card className={`timeline-canvas ${overview ? `overview-records overview-records--${view}` : ""}`}>
      {overview ? <div className="overview-record-toolbar">
        <div className="overview-record-views" aria-label="Entry view"><button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={()=>setView("list")}><List size={21}/></button><button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={()=>setView("grid")}><LayoutGrid size={20}/></button></div>
        <div className="overview-record-filters" aria-label="Filter by date"><button type="button" aria-pressed={period === "all"} onClick={()=>setPeriod("all")}>All entries</button><button type="button" aria-pressed={period === "week"} onClick={()=>setPeriod("week")}>This week</button><span title="All entries shown here are privately saved. Saved is not a separate bookmark state.">Saved</span></div>
        <p className={`overview-record-hint ${period === "all" ? "overview-record-hint--quiet" : ""}`}>Privately saved · {period === "week" ? "This week filters loaded entries. Load more to include earlier entries." : "Not automatically shared with Xiaoqi."}</p>
      </div> : <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Your timeline</h2>
        <Link className="primary-link" href="/journal"><PenLine size={16} aria-hidden="true" className="control-icon"/>
          New entry
        </Link>
      </div>}
      {(!overview || activeQuery) && <form className="my-5 flex flex-wrap gap-3" onSubmit={search}>
        <label className="min-w-0 flex-1">
          <span className="mb-2 block text-sm">Keywords</span>
          <input
            className={fieldClass}
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a moment"
          />
        </label>
        <Button className="self-end" type="submit"><Search size={16} aria-hidden="true" className="control-icon"/>
          Search
        </Button>
        <Button
          className="self-end"
          tone="secondary"
          type="button"
          onClick={() => {
            setQuery("");
            setActiveQuery("");
            resetPages();
          }}
        ><X size={16} aria-hidden="true" className="control-icon"/>
          Clear filters
        </Button>
      </form>}
      {!overview && <p className="mb-4 text-sm text-muted">
        Newest moments first, then creation time. Private unless you grant memory access.
      </p>}
      {loading && <p role="status">Loading your entries…</p>}
      <Feedback message={error} error />
      {error && (
        <Button
          tone="secondary"
          onClick={() => {
            resetPages();
            void refresh();
          }}
        ><RefreshCw size={16} aria-hidden="true" className="control-icon"/>
          Try again
        </Button>
      )}
      {!loading && !error && visibleEntries.length === 0 && (
        <EmptyState
          title={activeQuery ? "No matching entries" : period === "week" ? "No moments from this week in the loaded entries" : "No saved moments yet"}
          description={
            activeQuery
              ? "Try another keyword or clear your filters. Only your saved entries appear here."
              : "Start with a little moment. Saving privately and sharing with Xiaoqi are separate choices."
          }
        />
      )}
      <div className="timeline-story space-y-3">
        {visibleEntries.map((entry) => (
          <Link
            key={entry.id}
            href={`/journal/${entry.id}`}
            className="timeline-fragment glass-feature block p-5"
          >
            {overview && <JournalCover/>}
            <div className={overview ? "overview-entry-copy" : undefined}>
            <p className="fragment-date text-sm text-muted"><CalendarDays size={14} aria-hidden="true"/>{entry.event_date} · Private entry</p>
            <h3 className="my-2 break-words font-semibold">
              {entryTitle(entry)}
            </h3>
            <p className="line-clamp-3 break-words text-sm leading-7 text-muted">
              {entry.body}
            </p>
            <span className="mt-3 block text-sm text-sage-dark">
              <span className="icon-link"><BookOpen size={14} aria-hidden="true"/>View entry & privacy<ArrowUpRight size={14} aria-hidden="true"/></span>
            </span></div>
          </Link>
        ))}
      </div>
      <Feedback message={moreError} error />
      {data?.nextCursor && cursor !== "DONE" && (
        <Button
          className="mt-5"
          tone="secondary"
          disabled={loadingMore}
          onClick={more}
        ><ArrowDown size={16} aria-hidden="true" className="control-icon"/>
          {loadingMore ? "Loading…" : "Load earlier entries"}
        </Button>
      )}
    </Card>
  );
}
export function EntryDetail({ id }: { id: string }) {
  const api = useCoreApi();
  const router = useRouter();
  const { data, error, loading, refresh } = useResource<{ entry: Entry }>(
    `/api/journal-entries/${id}`,
  );
  const [editing, setEditing] = useState(false),
    [deleteOpen, setDeleteOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState("");
  const remaining = useRemaining(data?.entry.undo_until || null);
  async function remove() {
    if (!data) return;
    setBusy(true);
    setActionError("");
    try {
      await api(`/api/journal-entries/${id}`, "DELETE", {
        expectedVersion: data.entry.version,
      });
      router.push("/memories");
      router.refresh();
    } catch (e) {
      setActionError(messageOf(e));
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Loading your entry…</p>;
  if (error || !data)
    return (
      <Card>
        <Feedback message={error || "This entry is unavailable."} error />
        <Button tone="secondary" onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true" className="control-icon"/>
          Try again
        </Button>
        <Link className="ml-4 underline" href="/memories"><ArrowLeft size={16} aria-hidden="true" className="control-icon"/>
          Back to timeline
        </Link>
      </Card>
    );
  const entry = data.entry;
  return (
    <div className="entry-detail space-y-5">
      <Link className="inline-block py-3 text-sm underline" href="/memories"><ArrowLeft size={16} aria-hidden="true" className="control-icon"/>
        Back to your timeline
      </Link>
      <Feedback message={notice} />
      {editing ? (
        <>
          <EntryEditor
            key={entry.version}
            initial={entry}
            onSaved={() => {
              setNotice("Changes saved. Previous memory permissions are no longer active.");
              setEditing(false);
              void refresh();
            }}
          />
          <Button
            tone="secondary"
            onClick={() => {
              if (window.confirm("Discard your changes?")) setEditing(false);
            }}
          ><X size={16} aria-hidden="true" className="control-icon"/>
            Cancel editing
          </Button>
        </>
      ) : (
        <Card className="entry-reading">
          <p className="text-sm text-muted">
            {entry.event_date} · Private entry · Version {entry.version}
          </p>
          <h2 className="my-4 break-words text-2xl font-semibold">
            {entryTitle(entry)}
          </h2>
          <p className="whitespace-pre-wrap break-words leading-8">
            {entry.body}
          </p>
          <p className="my-5 text-sm text-muted">
            Created {new Date(entry.created_at).toLocaleString("en-US")} · Updated{" "}
            {new Date(entry.updated_at).toLocaleString("en-US")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button tone="secondary" onClick={() => setEditing(true)}><PenLine size={16} aria-hidden="true" className="control-icon"/>
              Edit entry
            </Button>
            <Button
              tone="danger"
              onClick={() => {
                setActionError("");
                setDeleteOpen(true);
              }}
            ><Trash2 size={16} aria-hidden="true" className="control-icon"/>
              {remaining !== null && remaining > 0
                ? `Undo save (${remaining}s) / Delete`
                : "Delete entry"}
            </Button>
          </div>
          <Feedback message={actionError} error />
        </Card>
      )}
      {!editing && <MemoryPermission entry={entry} />}
      {!editing && <JournalReview key={`${entry.id}:${entry.version}`} entry={entry} />}
      <Dialog
        open={deleteOpen}
        title="Delete this entry?"
        onClose={() => {
          if (!busy) setDeleteOpen(false);
        }}
      >
        <p className="mb-5 text-sm leading-7">
          This cannot be undone. The entry will become unavailable and its memory permissions and online summaries will be removed. Database backups follow the provider’s retention settings and may not be erased immediately.
        </p>
        <Feedback message={actionError} error />
        <div className="mt-5 flex gap-3">
          <Button
            tone="secondary"
            disabled={busy}
            onClick={() => setDeleteOpen(false)}
          ><X size={16} aria-hidden="true" className="control-icon"/>
            Cancel
          </Button>
          <Button tone="danger" disabled={busy} onClick={remove}><Trash2 size={16} aria-hidden="true" className="control-icon"/>
            {busy ? "Deleting…" : "Delete entry"}
          </Button>
        </div>
        {actionError && (
          <Button
            className="mt-4"
            tone="secondary"
            disabled={busy}
            onClick={() => {
              setDeleteOpen(false);
              void refresh();
            }}
          ><RefreshCw size={16} aria-hidden="true" className="control-icon"/>
            Reload latest version
          </Button>
        )}
      </Dialog>
    </div>
  );
}
