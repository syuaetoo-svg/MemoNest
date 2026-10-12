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
import { Button, Dialog, Feedback, fieldClass } from "./ui";
import { MemoryPermission } from "./memories";
import { JournalReview } from "./journal-review";

export function EntryEditor({
  initial,
  onSaved,
}: {
  initial?: Entry;
  onSaved?: (entry: Entry) => void;
}) {
  const api = useCoreApi();
  const [baseline, setBaseline] = useState({
    title: initial?.title || "",
    body: initial?.body || "",
    eventDate: initial?.event_date || "",
  });
  const [draft, setDraft] = useState<EntryDraft>(baseline),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<Entry | null>(null),
    [deleteOpen, setDeleteOpen] = useState(false),
    [undone, setUndone] = useState(false);
  useEffect(() => {
    if (initial) return;
    // Browser local date after hydration avoids a UTC/server date mismatch.
    const timer = setTimeout(() => {
      const date = localDate();
      setBaseline((value) => ({ ...value, eventDate: date }));
      setDraft((value) => ({ ...value, eventDate: value.eventDate || date }));
    }, 0);
    return () => clearTimeout(timer);
  }, [initial]);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const remaining = useRemaining(saved?.undo_until || null);
  const dirty =
    !saved &&
    (draft.title !== baseline.title ||
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
              ? "本次记录已删除，不再出现在私人时间线中"
              : initial
                ? "修改已保存；依赖旧版本的角色记忆已失效，新内容没有自动授权"
                : "已保存给你自己，尚未授权角色使用"
          }
        />
        <Feedback message={error} error />
        {!undone && (
          <Card>
            <p className="text-sm text-muted">{saved.event_date} · 私人记录</p>
            <h2 className="my-4 text-xl font-semibold">{entryTitle(saved)}</h2>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {saved.body}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/journal/${saved.id}`} className="primary-link">
                查看记录详情
              </Link>
              {!initial && remaining !== null && remaining > 0 && (
                <Button tone="secondary" onClick={() => setDeleteOpen(true)}>
                  撤销保存（{remaining} 秒）
                </Button>
              )}
            </div>
          </Card>
        )}
        <Link href="/memories" className="primary-link">
          回到私人时间线
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
            再写一篇
          </Button>
        )}
        <Dialog
          open={deleteOpen}
          title="撤销本次私人保存？"
          onClose={() => {
            if (!busy) setDeleteOpen(false);
          }}
        >
          <p className="mb-5 text-sm leading-7">
            将删除刚刚保存的记录。取消会保留记录，删除后无法恢复。
          </p>
          <div className="flex gap-3">
            <Button
              tone="secondary"
              disabled={busy}
              onClick={() => setDeleteOpen(false)}
            >
              取消
            </Button>
            <Button tone="danger" disabled={busy} onClick={undo}>
              {busy ? "正在删除…" : "确认撤销并删除"}
            </Button>
          </div>
        </Dialog>
      </div>
    );
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">
        {initial ? "修改生活记录" : "一篇新的生活记录"}
      </h2>
      <form onSubmit={prepare} className="space-y-5">
        <fieldset disabled={busy || preview} className="space-y-5">
          <div>
            <label htmlFor="journal-title" className="mb-2 block text-sm">
              给这个片刻起个名字（可留空）
            </label>
            <input
              id="journal-title"
              className={fieldClass}
              value={draft.title}
              maxLength={120}
              onChange={(e) => change("title", e.target.value)}
              placeholder="例如：下班路上的一片晚霞"
            />
          </div>
          <div>
            <label htmlFor="journal-date" className="mb-2 block text-sm">
              事情发生的日期
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
              今天发生了什么？（必填）
            </label>
            <textarea
              id="journal-body"
              className={fieldClass}
              rows={7}
              required
              maxLength={10000}
              value={draft.body}
              onChange={(e) => change("body", e.target.value)}
              placeholder="不用写得很完整，留住一个片刻就好。"
            />
          </div>
        </fieldset>
        <p className="text-sm leading-7 text-muted">
          仅保存到你的私人记录。不会默认进入 AI 上下文，也不需要选择角色。
          {initial && "保存修改会撤回依赖旧版本的角色授权。"}
        </p>
        <Feedback message={error} error />
        {preview ? (
          <div className="space-y-4 rounded-2xl bg-paper p-4">
            <h3 className="font-semibold">确认私人记录内容</h3>
            <p className="text-sm">
              {draft.eventDate} · {draft.title || "未命名片刻"}
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
                返回编辑
              </Button>
              <Button type="button" disabled={busy} onClick={save}>
                {busy
                  ? "正在保存…"
                  : initial
                    ? "确认保存修改"
                    : "确认保存为私人记录"}
              </Button>
            </div>
            {initial && (
              <Link
                className="block text-sm underline"
                href={`/journal/${initial.id}`}
              >
                冲突时重新加载记录（放弃当前草稿）
              </Link>
            )}
          </div>
        ) : (
          <Button type="submit">预览私人记录</Button>
        )}
      </form>
    </Card>
  );
}
export function JournalTimeline() {
  const api = useCoreApi();
  const pageGeneration = useRef(0);
  const [query, setQuery] = useState(""),
    [activeQuery, setActiveQuery] = useState(""),
    [extra, setExtra] = useState<Entry[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loadingMore, setLoadingMore] = useState(false),
    [moreError, setMoreError] = useState("");
  const { data, error, loading, refresh } = useResource<{
    entries: Entry[];
    nextCursor: string | null;
  }>(`/api/journal-entries?q=${encodeURIComponent(activeQuery)}`);
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
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">私人记录时间线</h2>
        <Link className="primary-link" href="/journal">
          写下新片刻
        </Link>
      </div>
      <form className="my-5 flex flex-wrap gap-3" onSubmit={search}>
        <label className="min-w-0 flex-1">
          <span className="mb-2 block text-sm">原文关键词</span>
          <input
            className={fieldClass}
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="找回一段经历"
          />
        </label>
        <Button className="self-end" type="submit">
          查找
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
        >
          清除筛选
        </Button>
      </form>
      <p className="mb-4 text-sm text-muted">
        按事件日期倒序；同日按创建时间排序。默认不供角色使用。
      </p>
      {loading && <p role="status">正在加载私人记录…</p>}
      <Feedback message={error} error />
      {error && (
        <Button
          tone="secondary"
          onClick={() => {
            resetPages();
            void refresh();
          }}
        >
          重试加载
        </Button>
      )}
      {!loading && !error && entries.length === 0 && (
        <EmptyState
          title={activeQuery ? "没有找到匹配记录" : "还没有保存的生活记录"}
          description={
            activeQuery
              ? "换个关键词，或清除筛选；这里不会生成不存在的经历。"
              : "从一个小片刻开始，私人保存与角色授权是两件事。"
          }
        />
      )}
      <div className="space-y-3">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/journal/${entry.id}`}
            className="block rounded-2xl border border-line bg-paper p-5 hover:border-sage"
          >
            <p className="text-sm text-muted">{entry.event_date} · 私人记录</p>
            <h3 className="my-2 break-words font-semibold">
              {entryTitle(entry)}
            </h3>
            <p className="line-clamp-3 break-words text-sm leading-7 text-muted">
              {entry.body}
            </p>
            <span className="mt-3 block text-sm text-sage-dark">
              查看全文与权限 →
            </span>
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
        >
          {loadingMore ? "正在加载…" : "加载更早的记录"}
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
  if (loading) return <p role="status">正在加载记录详情…</p>;
  if (error || !data)
    return (
      <Card>
        <Feedback message={error || "记录不可访问"} error />
        <Button tone="secondary" onClick={() => void refresh()}>
          重试加载
        </Button>
        <Link className="ml-4 underline" href="/memories">
          返回时间线
        </Link>
      </Card>
    );
  const entry = data.entry;
  return (
    <div className="space-y-5">
      <Link className="inline-block py-3 text-sm underline" href="/memories">
        ← 返回私人时间线
      </Link>
      <Feedback message={notice} />
      {editing ? (
        <>
          <EntryEditor
            key={entry.version}
            initial={entry}
            onSaved={() => {
              setNotice("修改已保存，旧角色授权已失效");
              setEditing(false);
              void refresh();
            }}
          />
          <Button
            tone="secondary"
            onClick={() => {
              if (window.confirm("放弃当前修改？")) setEditing(false);
            }}
          >
            取消编辑
          </Button>
        </>
      ) : (
        <Card>
          <p className="text-sm text-muted">
            {entry.event_date} · 私人记录 · 版本 {entry.version}
          </p>
          <h2 className="my-4 break-words text-2xl font-semibold">
            {entryTitle(entry)}
          </h2>
          <p className="whitespace-pre-wrap break-words leading-8">
            {entry.body}
          </p>
          <p className="my-5 text-sm text-muted">
            创建于 {new Date(entry.created_at).toLocaleString("zh-CN")} · 更新于{" "}
            {new Date(entry.updated_at).toLocaleString("zh-CN")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button tone="secondary" onClick={() => setEditing(true)}>
              编辑记录
            </Button>
            <Button
              tone="danger"
              onClick={() => {
                setActionError("");
                setDeleteOpen(true);
              }}
            >
              {remaining !== null && remaining > 0
                ? `撤销保存（${remaining} 秒） / 删除`
                : "删除记录"}
            </Button>
          </div>
          <Feedback message={actionError} error />
        </Card>
      )}
      {!editing && <MemoryPermission entry={entry} />}
      {!editing && <JournalReview key={`${entry.id}:${entry.version}`} entry={entry} />}
      <Dialog
        open={deleteOpen}
        title="删除这篇私人记录？"
        onClose={() => {
          if (!busy) setDeleteOpen(false);
        }}
      >
        <p className="mb-5 text-sm leading-7">
          原记录将无法查看，派生的角色记忆会同时撤回并清除在线摘要。无法恢复；数据库备份按服务商配置保留，不承诺即时擦除备份。
        </p>
        <Feedback message={actionError} error />
        <div className="mt-5 flex gap-3">
          <Button
            tone="secondary"
            disabled={busy}
            onClick={() => setDeleteOpen(false)}
          >
            取消
          </Button>
          <Button tone="danger" disabled={busy} onClick={remove}>
            {busy ? "正在删除…" : "确认删除记录"}
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
          >
            重新加载当前版本
          </Button>
        )}
      </Dialog>
    </div>
  );
}
