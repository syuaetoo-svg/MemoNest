"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Send, Sparkles, BookOpen, ShieldCheck, Link2, Bookmark, MessageCircle, LoaderCircle, X, ChevronUp, CircleCheck, CircleAlert, Info, Search, RefreshCw, ArrowLeft, ArrowDown, History } from "lucide-react";
import { GlassCompanion } from "@/components/glass-companion";
import { Card, EmptyState } from "@/components/ui";
import {
  useCoreApi,
  useResource,
  useUnsavedGuard,
  messageOf,
} from "@/lib/core/client";
import { type Entry, entryTitle } from "@/lib/core/contracts";
import type {
  ChatResult,
  DraftResult,
  ReviewResult,
  Citation,
  Source,
} from "@/lib/ai/contracts";
import { EntryEditor } from "./journal";
import { Button, Feedback, fieldClass } from "./ui";

function Consent({
  checked,
  onChange,
  scope,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  scope: string;
  disabled?: boolean;
}) {
  return (
    <label className="consent-panel flex items-start gap-3 rounded-2xl p-4 text-sm leading-6">
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        I agree to send {scope} to the configured AI provider (Groq or OpenAI) for this request.
         This does not save entries or grant long-term memory access.
        <span className="mt-1 block text-xs text-muted">
          The provider may retain content under its safety policies. Revoking memory access cannot recall data already sent.
          <Link href="/privacy" className="icon-link underline">
            <ShieldCheck aria-hidden="true"/>
            What is shared
          </Link>
        </span>
      </span>
    </label>
  );
}
export function Evidence({
  citations,
  sources,
}: {
  citations: Citation[];
  sources: Source[];
}) {
  if (!citations.length) return null;
  return (
    <details className="evidence mt-4 rounded-xl border border-line p-3 text-xs leading-6">
      <summary className="cursor-pointer font-medium text-sage-dark">
        <Link2 aria-hidden="true"/>
        View sources ({citations.length})
      </summary>
      {citations.map((item, index) => {
        const source = sources.find((s) => s.id === item.sourceId);
        return (
          <blockquote
            key={`${item.sourceId}-${index}`}
            className="mt-3 border-l-2 border-sage pl-3"
          >
            <p className="whitespace-pre-wrap break-words">{item.quote}</p>
            {source?.entryId && (
              <Link className="icon-link underline" href={`/journal/${source.entryId}`}>
                <BookOpen aria-hidden="true"/>
                Open source entry
              </Link>
            )}
          </blockquote>
        );
      })}
    </details>
  );
}
type Turn = { id: string; text: string; result: ChatResult };
export function ChatWorkspace({ configured, embedded = false }: { configured: boolean; embedded?: boolean }) {
  const api = useCoreApi();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<"chat" | "draft" | null>(null);
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState<DraftResult | null>(null);
  const [candidateSources, setCandidateSources] = useState<Source[]>([]);
  const [savedCandidate, setSavedCandidate] = useState(false);
  const lock = useRef(false);
  useUnsavedGuard(
    Boolean(text || turns.length || (candidate && !savedCandidate)),
  );
  async function send() {
    if (!text.trim() || !consent || lock.current || !configured) return;
    lock.current = true;
    setBusy("chat");
    setError("");
    const message = { id: crypto.randomUUID(), text: text.trim() };
    try {
      // Never resend AI replies: they may contain memories since revoked.
      const messages = [
        ...turns.slice(-4).map(({ id, text }) => ({ id, text })),
        message,
      ];
      const result = await api<ChatResult>("/api/ai/chat", "POST", {
        consent: true,
        messages,
      });
      setTurns((rows) => [...rows, { ...message, result }]);
      setText("");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  async function extract() {
    if (!selected.length || !consent || lock.current) return;
    lock.current = true;
    setBusy("draft");
    setError("");
    setCandidate(null);
    const messages = turns
      .filter((turn) => selected.includes(turn.id))
      .map(({ id, text }) => ({ id, text }));
    try {
      const result = await api<DraftResult>("/api/ai/draft", "POST", {
        consent: true,
        messages,
      });
      setCandidate(result);
      setSavedCandidate(false);
      setCandidateSources(messages.map((m) => ({ id: m.id, text: m.text })));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  return (
    <div className={`chat-workspace grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] ${embedded ? "chat-workspace--embedded" : ""}`}>
      <Card className="companion-profile lg:sticky lg:top-6">
        <GlassCompanion size="small" state={busy ? "thinking" : turns.length ? "reply" : "idle"} />
        <p className="eyebrow">YOUR QUIET COMPANION</p>
        <h2 className="my-3 text-2xl font-semibold">Xiaoqi</h2>
        <p className="text-sm leading-7 text-muted">
          No need to have it all figured out. What’s on your mind?
        </p>
        <details className="companion-boundary mt-5 border-t border-line pt-4 text-xs leading-6 text-muted">
          <summary><Info size={14} aria-hidden="true"/>Chat & memory privacy</summary>
          <p className="mt-2">
          AI companion · Chat stays on this page
          <br />
          Chat clears when you leave or refresh. Requests use your last five
          messages and relevant authorized summaries. Earlier AI replies are not sent again.
          </p>
        </details>
        <Link
          className="mt-4 block text-sm text-sage-dark underline"
          href="/memories"
        >
          Manage memory access
          <Sparkles aria-hidden="true"/>
        </Link>
        <Link
          className="mt-3 block text-sm text-sage-dark underline"
          href="/journal"
        >
          Write an entry instead
          <BookOpen aria-hidden="true"/>
        </Link>
      </Card>
      <div className="min-w-0 space-y-5">
        <Card className="chat-surface">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <h2 className="font-medium"><MessageCircle size={17} aria-hidden="true"/>Today’s moments</h2>
            <span className="chat-service">
              {configured ? <CircleCheck aria-hidden="true"/> : <CircleAlert aria-hidden="true"/>}
              {configured ? "AI connected" : "AI not connected"}
            </span>
          </div>
          {!turns.length && (embedded ? <p className="overview-initial-bubble">What would you like to share today?</p> :
            <EmptyState
              showCompanion={false}
              title="Start with a little thought"
              description="Share a little moment or make room for a thought. You choose what to keep."
            />
          )}
          <div
            className="my-5 space-y-6"
            aria-live="polite"
            aria-relevant="additions"
          >
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-3">
                <div className="chat-user ml-5 rounded-2xl rounded-tr-sm p-4">
                  <p className="mb-2 text-xs text-sage-dark">You</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {turn.text}
                  </p>
                  <label className="chat-selection mt-3 flex min-h-11 items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={selected.includes(turn.id)}
                      disabled={
                        Boolean(busy) ||
                        Boolean(candidate?.body) ||
                        (selected.length >= 6 && !selected.includes(turn.id))
                      }
                      onChange={(e) =>
                        setSelected((ids) =>
                          e.target.checked
                            ? [...ids, turn.id]
                            : ids.filter((id) => id !== turn.id),
                        )
                      }
                    />
                    <Bookmark aria-hidden="true"/>Add to draft
                  </label>
                </div>
                <div className="chat-reply mr-5 rounded-2xl rounded-tl-sm p-4">
                  <p className="mb-2 text-xs text-sage-dark"><GlassCompanion size="mark" state="reply" />Xiaoqi · AI</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {turn.result.reply}
                  </p>
                  <Evidence
                    citations={turn.result.citations}
                    sources={turn.result.sources}
                  />
                </div>
              </div>
            ))}
          </div>
          {busy && (
            <p role="status" className="chat-status my-4 text-sm text-sage-dark">
              <GlassCompanion size="mark" state="thinking" />
              <LoaderCircle aria-hidden="true"/>
              {busy === "chat"
                ? "Xiaoqi is listening…"
                : "Putting your selected thoughts together…"}
            </p>
          )}
          <Feedback error message={error} />
          {!configured && (
            <Feedback message="AI is not connected yet. You can still write and save an entry yourself." />
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="chat-composer mt-5 space-y-4"
          >
            <label htmlFor="chat-message" className="block text-sm font-medium">
              <MessageCircle aria-hidden="true"/>
              A thought to share
            </label>
            <textarea
              id="chat-message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              rows={embedded ? 1 : 3}
              className={fieldClass}
              disabled={Boolean(busy) || !configured}
              placeholder="There’s a moment I’d like to keep…"
            />
            <Consent
              checked={consent}
              onChange={setConsent}
              disabled={Boolean(busy) || !configured}
              scope="your recent messages and relevant authorized summaries; for a draft, only your selected words"
            />
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={
                  Boolean(busy) || !consent || !text.trim() || !configured
                }
                type="submit"
              >
                <Send size={15} className="mr-2 inline" aria-hidden="true" />
                {error ? "Try sending again" : "Send"}
              </Button>
              <Button
                type="button"
                tone="secondary"
                disabled={
                  Boolean(busy) ||
                  !selected.length ||
                  !consent ||
                  !configured ||
                  Boolean(candidate?.body)
                }
                onClick={extract}
              >
                <Sparkles
                  size={15}
                  className="mr-2 inline"
                  aria-hidden="true"
                />
                Create draft ({selected.length})
              </Button>
            </div>
          </form>
        </Card>
        {candidate && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-lg font-semibold">Review before you keep it</h2>
              <p className="mt-3 text-sm leading-7">
                {candidate.note ||
                  "Check the wording and date. Saving does not give Xiaoqi memory access."}
              </p>
              <Evidence
                citations={candidate.evidence}
                sources={candidateSources}
              />
              <Button
                className="mt-4"
                tone="secondary"
                onClick={() => {
                  if (
                    !savedCandidate &&
                    candidate.body &&
                    !window.confirm("Discard this unsaved draft?")
                  )
                    return;
                  setCandidate(null);
                  setSelected([]);
                }}
              >
                {savedCandidate ? <ChevronUp size={16} aria-hidden="true"/> : <X size={16} aria-hidden="true"/>}
                {savedCandidate ? "Close saved entry" : "Discard draft"}
              </Button>
            </Card>
            {candidate.body && (
              <EntryEditor
                initialDraft={{
                  title: candidate.title,
                  body: candidate.body,
                  eventDate: "",
                }}
                onSaved={() => {
                  setSavedCandidate(true);
                  if (embedded) window.dispatchEvent(new Event("memonest:entries-changed"));
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReviewWorkspace({ configured }: { configured: boolean }) {
  const api = useCoreApi();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const path = `/api/journal-entries?q=${encodeURIComponent(search)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  const resource = useResource<{ entries: Entry[]; nextCursor: string | null }>(
    path,
  );
  const [selected, setSelected] = useState<Entry[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");
  const lock = useRef(false);
  function choose(entry: Entry) {
    setSelected((rows) =>
      rows.some((row) => row.id === entry.id)
        ? rows.filter((row) => row.id !== entry.id)
        : [...rows, entry],
    );
    setConsent(false);
    setResult(null);
    setError("");
  }
  async function createReview() {
    if (lock.current || !selected.length || !consent) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await api<ReviewResult>("/api/ai/period-review", "POST", {
          consent: true,
          entries: selected.map(({ id, version }) => ({ id, version })),
        }),
      );
    } catch (e) {
      setError(messageOf(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="review-workspace">
      <Card className="review-selection">
        <p className="eyebrow">CHOOSE YOUR MOMENTS</p>
        <h2 className="my-3 text-xl font-semibold">Choose your moments</h2>
        <p className="mb-5 text-sm leading-7 text-muted">
          Choose up to eight
          entries. Changing your selection resets consent for this request. Long-term memory permissions stay unchanged.
        </p>
        <form
          className="mb-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query);
            setCursor(null);
          }}
        >
          <input
            aria-label="Search entries for your reflection"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
            className={fieldClass}
            placeholder="Search a person, a moment…"
          />
          <Button tone="secondary" type="submit"><Search size={16} aria-hidden="true" className="control-icon"/>
            Search
          </Button>
        </form>
        {resource.loading && <p role="status">Loading entries…</p>}
        {resource.error && (
          <>
            <Feedback error message={resource.error} />
            <Button tone="secondary" onClick={resource.refresh}><RefreshCw size={16} aria-hidden="true" className="control-icon"/>
              Reload
            </Button>
          </>
        )}
        {resource.data && !resource.data.entries.length && (
          <EmptyState
            title="No matching moments yet"
            description="Try another search or write your first entry."
          />
        )}
        <div className="space-y-3">
          {resource.data?.entries.map((entry) => (
            <label
              key={entry.id}
              className="timeline-moment flex gap-3 rounded-2xl border border-line p-4"
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                checked={selected.some((row) => row.id === entry.id)}
                disabled={
                  busy ||
                  (selected.length >= 8 &&
                    !selected.some((row) => row.id === entry.id))
                }
                onChange={() => choose(entry)}
              />
              <span className="min-w-0">
                <span className="block text-xs text-muted">
                  {entry.event_date}
                </span>
                <span className="my-1 block font-medium">
                  {entryTitle(entry)}
                </span>
                <span className="line-clamp-2 break-words text-sm text-muted">
                  {entry.body}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          {cursor && (
            <Button tone="secondary" onClick={() => setCursor(null)}><ArrowLeft size={16} aria-hidden="true" className="control-icon"/>
              First page
            </Button>
          )}
          {resource.data?.nextCursor && (
            <Button
              tone="secondary"
              onClick={() => setCursor(resource.data!.nextCursor)}
            ><ArrowDown size={16} aria-hidden="true" className="control-icon"/>
              Next page
            </Button>
          )}
        </div>
      </Card>
      <div className="review-narrative space-y-5">
        <Card className="review-plan">
          <h2 className="text-xl font-semibold">
            Your reflection · {selected.length} entries
          </h2>
          <ul className="my-4 space-y-2 text-sm">
            {selected.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  {entry.event_date} · {entryTitle(entry)}
                </span>
                <button
                  className="min-h-11 shrink-0 px-2 text-sage-dark underline"
                  disabled={busy}
                  onClick={() => choose(entry)}
                ><X size={16} aria-hidden="true" className="control-icon"/>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <Consent
            checked={consent}
            onChange={setConsent}
            disabled={busy || !selected.length || !configured}
            scope={`the ${selected.length} selected entries in full`}
          />
          <Button
            className="mt-4"
            disabled={busy || !consent || !selected.length || !configured}
            onClick={createReview}
          ><History size={16} aria-hidden="true" className="control-icon"/>
            {busy ? "Creating your reflection…" : "Create reflection"}
          </Button>
          {!configured && (
            <p className="mt-4 text-sm text-muted">
              AI is not connected yet. You can still read your original entries in the timeline.
            </p>
          )}
          <div className="mt-4">
            <Feedback error message={error} />
          </div>
          <Link
            href="/memories"
            className="mt-4 block text-sm text-sage-dark underline"
          ><ArrowLeft size={16} aria-hidden="true" className="control-icon"/>
            Back to your timeline
          </Link>
        </Card>
        {result && (
          <Card className="review-story">
            <p className="eyebrow">A LOOK BACK · AI generated</p>
            <h2 className="my-4 text-2xl font-semibold">{result.title}</h2>
            <p className="mb-4 text-xs text-muted">
              Based only on your selected entries and not saved. Check the original text: a real source does not make every interpretation accurate.
            </p>
            {result.moments.map((moment, index) => (
              <div key={index} className="timeline-moment py-5">
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {moment.text}
                </p>
                <Evidence
                  citations={moment.evidence}
                  sources={result.sources}
                />
              </div>
            ))}
            {result.reflection && (
              <p className="rounded-2xl bg-clay-light p-5 text-sm leading-7">
                {result.reflection}
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
