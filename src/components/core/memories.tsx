"use client";
import { Sparkles, ShieldOff, X, RefreshCw, PenLine } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useCoreApi, messageOf, useResource } from "@/lib/core/client";
import type { Entry, Memory } from "@/lib/core/contracts";
import { Card, EmptyState } from "@/components/ui";
import { Button, Dialog, Feedback, fieldClass } from "./ui";
import { useRemaining } from "@/lib/core/use-remaining";
import { JournalTimeline as PrivateTimeline } from "./journal";

export function MemoryPermission({ entry }: { entry: Entry }) {
  const api = useCoreApi();
  const { data, error, loading, refresh } = useResource<{ memories: Memory[] }>(
    `/api/memories?entryId=${entry.id}`,
  );
  const [mode, setMode] = useState<"grant" | "edit" | "revoke" | null>(null),
    [summary, setSummary] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState("");
  const key = useRef<{ fingerprint: string; id: string } | null>(null);
  const remaining = useRemaining(entry.undo_until);
  const active = data?.memories.find((m) => m.status === "active");
  function open(next: "grant" | "edit" | "revoke") {
    setMode(next);
    setSummary(next === "edit" ? active?.summary || "" : "");
    setConfirmed(false);
    setActionError("");
  }
  async function submit() {
    if (!mode) return;
    setActionError("");
    if (mode !== "revoke" && (!confirmed || !summary.trim())) {
      setActionError("Enter the exact summary and check the consent box before sharing.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "revoke") {
        if (!active) throw new Error("Permission has changed. Please reload.");
        await api(`/api/memories/${active.id}/revoke`, "POST", {});
        setNotice("Permission withdrawn. Your entry is kept; this summary is excluded from future requests.");
      } else {
        const input = {
          entryId: entry.id,
          sourceVersion: entry.version,
          summary: summary.trim(),
          confirmed: true,
          ...(mode === "edit" && active
            ? { expectedMemoryVersion: active.version }
            : {}),
        };
        const fingerprint = JSON.stringify({
          ...input,
          replace: mode === "edit" ? active?.id : null,
        });
        if (key.current?.fingerprint !== fingerprint)
          key.current = { fingerprint, id: crypto.randomUUID() };
        await api(
          mode === "edit" ? `/api/memories/${active!.id}` : "/api/memories",
          mode === "edit" ? "PATCH" : "POST",
          { ...input, requestId: key.current!.id },
        );
        setNotice(
          mode === "edit"
            ? "New summary confirmed. Previous permission withdrawn."
            : "Summary shared with Xiaoqi. Other private content has not been shared.",
        );
      }
      setMode(null);
      await refresh();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="permission-surface">
      <h2 className="text-xl font-semibold"><Sparkles size={20} className="control-icon" aria-hidden="true"/>Xiaoqi’s memory</h2>
      <p className="my-4 text-sm leading-7 text-muted">
        Your private journal and long-term memory are separate. Manage what Xiaoqi may use in future chats here.
        Each AI reflection needs separate consent and does not change these permissions.
      </p>
      {loading && <p role="status">Checking memory access…</p>}
      <Feedback message={error} error />
      {error && (
        <Button tone="secondary" onClick={() => void refresh()}><Sparkles size={16} aria-hidden="true" className="control-icon"/>
          Check access again
        </Button>
      )}
      <Feedback message={notice} />
      {!loading && !error && (
        <>
          {active ? (
            <div className="grant-summary rounded-2xl p-5">
              <p className="font-medium">
                Shared with Xiaoqi only · Source version {active.source_version}
              </p>
              <p className="my-3 whitespace-pre-wrap break-words text-sm leading-7">
                {active.summary}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button tone="secondary" onClick={() => open("edit")}><Sparkles size={16} aria-hidden="true" className="control-icon"/>
                  Edit shared summary
                </Button>
                <Button tone="danger" onClick={() => open("revoke")}><ShieldOff size={16} aria-hidden="true" className="control-icon"/>
                  Revoke access
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm">
                Not shared. This entry is not available as long-term memory.
              </p>
              <Button
                disabled={remaining === null || remaining > 0}
                onClick={() => open("grant")}
              ><Sparkles size={16} aria-hidden="true" className="control-icon"/>
                Share a memory
              </Button>
              {remaining === null ? (
                <p className="mt-3 text-sm text-muted">Checking the undo window…</p>
              ) : (
                remaining > 0 && (
                  <p className="mt-3 text-sm text-muted">
                    Memory sharing becomes available in about {remaining} seconds, after the private-save undo window ends.
                  </p>
                )
              )}
            </>
          )}
        </>
      )}
      <Dialog
        open={mode !== null}
        title={
          mode === "revoke"
            ? "Revoke Xiaoqi’s access?"
            : mode === "edit"
              ? "Edit & share a new summary"
              : "Share with Xiaoqi"
        }
        onClose={() => {
          if (!busy) setMode(null);
        }}
      >
        {mode === "revoke" ? (
          <p className="mb-5 text-sm leading-7">
            Your private entry stays. The online summary is cleared and excluded from future requests. Past replies and data already sent cannot be recalled.
          </p>
        ) : (
          <div className="space-y-5">
            <p className="text-sm leading-7">
              Allow Xiaoqi to use only the exact summary below in future chats, until you revoke access, delete or edit the source. Other entry content is not shared. This step does not send data to an AI provider.
            </p>
            <p className="text-sm text-muted">
              Source: {entry.event_date} · Version {entry.version}
            </p>
            <div>
              <label htmlFor="memory-summary" className="mb-2 block text-sm">
                Exact summary to share (up to 1,200 characters)
              </label>
              <textarea
                id="memory-summary"
                className={fieldClass}
                rows={5}
                maxLength={1200}
                value={summary}
                disabled={busy}
                onChange={(e) => {
                  setSummary(e.target.value);
                  setConfirmed(false);
                }}
              />
            </div>
            <label className="flex min-h-11 items-start gap-3 text-sm leading-7">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-2 size-4 shrink-0"
              />
              I have reviewed this summary and allow Xiaoqi to use this source version. Saving privately is not consent to share.
            </label>
          </div>
        )}
        <div className="my-5">
          <Feedback message={actionError} error />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            tone="secondary"
            disabled={busy}
            onClick={() => setMode(null)}
          ><X size={16} aria-hidden="true" className="control-icon"/>
            Cancel
          </Button>
          <Button
            tone={mode === "revoke" ? "danger" : "primary"}
            disabled={busy}
            onClick={submit}
          ><ShieldOff size={16} aria-hidden="true" className="control-icon"/>
            {busy
              ? "Confirming…"
              : mode === "revoke"
                ? "Confirm revoke"
                : mode === "edit"
                  ? "Confirm & share new summary"
                  : "Share this summary"}
          </Button>
        </div>
        {actionError && (
          <Link
            className="mt-4 block py-3 text-sm underline"
            href={`/journal/${entry.id}`}
          ><Sparkles size={16} aria-hidden="true" className="control-icon"/>
            Reload source & permissions (discard changes)
          </Link>
        )}
      </Dialog>
    </Card>
  );
}
export function MemoryList() {
  const api = useCoreApi();
  const { data, error, loading, refresh } = useResource<{
    memories: Memory[];
    nextCursor: string | null;
  }>("/api/memories");
  const [extra, setExtra] = useState<Memory[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loadingMore, setLoadingMore] = useState(false),
    [actionError, setActionError] = useState(""),
    [target, setTarget] = useState<Memory | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const rows = data ? [...data.memories, ...extra] : [];
  async function more() {
    const next = cursor || data?.nextCursor;
    if (!next) return;
    setLoadingMore(true);
    setActionError("");
    try {
      const result = await api<{
        memories: Memory[];
        nextCursor: string | null;
      }>(`/api/memories?cursor=${encodeURIComponent(next)}`);
      setExtra((prev) => [...prev, ...result.memories]);
      setCursor(result.nextCursor || "DONE");
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      setLoadingMore(false);
    }
  }
  async function revoke() {
    if (!target) return;
    setBusy(true);
    setActionError("");
    try {
      await api(`/api/memories/${target.id}/revoke`, "POST", {});
      setNotice("Access revoked. Your private entry is kept.");
      setTarget(null);
      setExtra([]);
      setCursor(null);
      await refresh();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  const names = {
    active: "Active",
    revoked: "Revoked",
    invalidated: "Source or summary changed; previous access expired",
    deleted: "Source entry deleted",
  };
  return (
    <Card className="memory-vault">
      <h2 className="text-xl font-semibold">Xiaoqi’s memories</h2>
      <p className="my-4 text-sm leading-7 text-muted">
        Only summaries you confirm individually may be used in future chats. No AI
        request is made here. Revoking access keeps your entry; expired summaries are cleared from this list.
      </p>
      {loading && <p role="status">Loading memories…</p>}
      <Feedback message={error} error />
      {error && (
        <Button
          tone="secondary"
          onClick={() => {
            setExtra([]);
            setCursor(null);
            void refresh();
          }}
        ><RefreshCw size={16} aria-hidden="true" className="control-icon"/>
          Try again
        </Button>
      )}
      <Feedback message={notice} />
      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="No shared memories yet"
          description="You can keep and revisit your journal without sharing it with Xiaoqi."
        />
      )}
      <div className="space-y-4">
        {rows.map((memory) => (
          <article
            key={memory.id}
            className={`memory-authorization memory-authorization--${memory.status} rounded-2xl border border-line p-5`}
          >
            <h3 className="font-semibold">{memory.status === "active" ? <Sparkles size={16} aria-hidden="true"/> : <ShieldOff size={16} aria-hidden="true"/>}{names[memory.status]}</h3>
            <p className="my-2 text-sm text-muted">
              Xiaoqi only · Source version {memory.source_version} ·{" "}
              {new Date(memory.created_at).toLocaleString("en-US")}
            </p>
            {memory.status === "active" ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {memory.summary}
              </p>
            ) : (
              <p className="text-sm text-muted">
                The old summary has been cleared. Open the source entry, if available, to share a new summary.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {memory.status !== "deleted" && (
                <Link
                  href={`/journal/${memory.journal_entry_id}`}
                  className="primary-link"
                ><Sparkles size={16} aria-hidden="true" className="control-icon"/>
                  View source / Edit access
                </Link>
              )}
              {memory.status === "active" && (
                <Button
                  tone="danger"
                  onClick={() => {
                    setActionError("");
                    setTarget(memory);
                  }}
                ><ShieldOff size={16} aria-hidden="true" className="control-icon"/>
                  Revoke access
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      <Feedback message={target ? "" : actionError} error />
      {data?.nextCursor && cursor !== "DONE" && (
        <Button
          className="mt-5"
          tone="secondary"
          disabled={loadingMore}
          onClick={more}
        ><Sparkles size={16} aria-hidden="true" className="control-icon"/>
          {loadingMore ? "Loading…" : "Load earlier permissions"}
        </Button>
      )}
      <Dialog
        open={!!target}
        title="Revoke access to this memory?"
        onClose={() => {
          if (!busy) setTarget(null);
        }}
      >
        <p className="mb-5 text-sm leading-7">
          Your private entry stays. Xiaoqi will no longer use this summary in future requests. Existing replies remain visible.
        </p>
        <Feedback message={actionError} error />
        <div className="mt-5 flex gap-3">
          <Button
            tone="secondary"
            disabled={busy}
            onClick={() => setTarget(null)}
          ><X size={16} aria-hidden="true" className="control-icon"/>
            Cancel
          </Button>
          <Button tone="danger" disabled={busy} onClick={revoke}><ShieldOff size={16} aria-hidden="true" className="control-icon"/>
            {busy ? "Revoking access…" : "Confirm revoke"}
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
export function MemoryWorkspace() {
  const [tab, setTab] = useState<"private" | "role">("private");
  return (
    <div className="memory-workspace space-y-5">
      <div className="memory-switch flex flex-wrap gap-3" aria-label="Journal & memory access">
        <Button
          aria-pressed={tab === "private"}
          tone={tab === "private" ? "primary" : "secondary"}
          onClick={() => setTab("private")}
        ><PenLine size={16} aria-hidden="true" className="control-icon"/>
          Private entries
        </Button>
        <Button
          aria-pressed={tab === "role"}
          tone={tab === "role" ? "primary" : "secondary"}
          onClick={() => setTab("role")}
        ><Sparkles size={16} aria-hidden="true" className="control-icon"/>
          Shared memories
        </Button>
      </div>
      {tab === "private" ? <PrivateTimeline /> : <MemoryList />}
    </div>
  );
}
