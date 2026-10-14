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
      setActionError("请填写要授权的确切摘要，并主动勾选确认范围");
      return;
    }
    setBusy(true);
    try {
      if (mode === "revoke") {
        if (!active) throw new Error("当前授权已变化，请重新加载");
        await api(`/api/memories/${active.id}/revoke`, "POST", {});
        setNotice("授权已撤回，私人记录仍保留；后续上下文不再允许使用这条摘要");
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
            ? "新摘要已单独确认；旧授权已撤回"
            : "已授权这条摘要给小栖；其他私人内容没有自动授权",
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
      <h2 className="text-xl font-semibold"><Sparkles size={20} className="control-icon" aria-hidden="true"/>小栖的角色记忆</h2>
      <p className="my-4 text-sm leading-7 text-muted">
        私人记录与长期记忆是两件事。这里只管理未来可供小栖使用的授权范围；
        单篇 AI 回顾需要另外同意当次处理，不会改变这里的授权。
      </p>
      {loading && <p role="status">正在检查授权状态…</p>}
      <Feedback message={error} error />
      {error && (
        <Button tone="secondary" onClick={() => void refresh()}><Sparkles size={16} aria-hidden="true" className="control-icon"/>
          重新检查授权
        </Button>
      )}
      <Feedback message={notice} />
      {!loading && !error && (
        <>
          {active ? (
            <div className="grant-summary rounded-2xl p-5">
              <p className="font-medium">
                已授权 · 仅限小栖 · 来源版本 {active.source_version}
              </p>
              <p className="my-3 whitespace-pre-wrap break-words text-sm leading-7">
                {active.summary}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button tone="secondary" onClick={() => open("edit")}><Sparkles size={16} aria-hidden="true" className="control-icon"/>
                  编辑授权摘要
                </Button>
                <Button tone="danger" onClick={() => open("revoke")}><ShieldOff size={16} aria-hidden="true" className="control-icon"/>
                  撤回授权
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm">
                尚未授权，原记录不会进入角色长期上下文。
              </p>
              <Button
                disabled={remaining === null || remaining > 0}
                onClick={() => open("grant")}
              ><Sparkles size={16} aria-hidden="true" className="control-icon"/>
                让小栖记住这条
              </Button>
              {remaining === null ? (
                <p className="mt-3 text-sm text-muted">正在检查撤销窗口…</p>
              ) : (
                remaining > 0 && (
                  <p className="mt-3 text-sm text-muted">
                    请先完成私人保存的撤销窗口，约 {remaining} 秒后可单独授权。
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
            ? "撤回小栖的这条授权？"
            : mode === "edit"
              ? "编辑摘要并重新授权"
              : "单独授权给小栖"
        }
        onClose={() => {
          if (!busy) setMode(null);
        }}
      >
        {mode === "revoke" ? (
          <p className="mb-5 text-sm leading-7">
            会保留私人记录，清除这条在线授权摘要。小栖后续不再使用；无法收回已生成或已发送的历史内容。
          </p>
        ) : (
          <div className="space-y-5">
            <p className="text-sm leading-7">
              仅限小栖在后续聊天中按需使用下面的确切摘要，持续到你撤回、删除或修改来源。不会因此授权原记录其他内容。本阶段不向模型发送数据。
            </p>
            <p className="text-sm text-muted">
              来源：{entry.event_date} · 版本 {entry.version}
            </p>
            <div>
              <label htmlFor="memory-summary" className="mb-2 block text-sm">
                你允许使用的确切摘要（最多 1200 字）
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
              我已检查这段摘要，允许小栖使用此来源版本；私人保存本身不构成授权。
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
            取消
          </Button>
          <Button
            tone={mode === "revoke" ? "danger" : "primary"}
            disabled={busy}
            onClick={submit}
          ><ShieldOff size={16} aria-hidden="true" className="control-icon"/>
            {busy
              ? "正在确认…"
              : mode === "revoke"
                ? "确认撤回授权"
                : mode === "edit"
                  ? "确认新摘要并重新授权"
                  : "确认授权这条摘要"}
          </Button>
        </div>
        {actionError && (
          <Link
            className="mt-4 block py-3 text-sm underline"
            href={`/journal/${entry.id}`}
          ><Sparkles size={16} aria-hidden="true" className="control-icon"/>
            重新加载来源与授权（放弃当前修改）
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
      setNotice("授权已撤回，私人记录仍保留");
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
    active: "有效授权",
    revoked: "已撤回",
    invalidated: "来源或摘要已修改，旧授权失效",
    deleted: "原记录已删除",
  };
  return (
    <Card className="memory-vault">
      <h2 className="text-xl font-semibold">角色记忆 · 小栖</h2>
      <p className="my-4 text-sm leading-7 text-muted">
        只有你逐条确认的摘要才允许进入角色上下文。没有 AI
        接口；撤回不删除私人记录，失效摘要不会保留在在线列表中。
      </p>
      {loading && <p role="status">正在加载角色记忆…</p>}
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
          重试加载
        </Button>
      )}
      <Feedback message={notice} />
      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="尚未授权任何角色记忆"
          description="你仍可以保存和回看私人记录，不必让小栖记住。"
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
              仅限小栖 · 来源版本 {memory.source_version} ·{" "}
              {new Date(memory.created_at).toLocaleString("zh-CN")}
            </p>
            {memory.status === "active" ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {memory.summary}
              </p>
            ) : (
              <p className="text-sm text-muted">
                旧摘要已清除；如需重新授权，请打开仍存在的原记录。
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {memory.status !== "deleted" && (
                <Link
                  href={`/journal/${memory.journal_entry_id}`}
                  className="primary-link"
                ><Sparkles size={16} aria-hidden="true" className="control-icon"/>
                  来源详情 / 编辑授权
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
                  撤回授权
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
          {loadingMore ? "正在加载…" : "加载更早的授权记录"}
        </Button>
      )}
      <Dialog
        open={!!target}
        title="撤回这条角色记忆授权？"
        onClose={() => {
          if (!busy) setTarget(null);
        }}
      >
        <p className="mb-5 text-sm leading-7">
          保留私人记录，小栖后续不再使用这条摘要。已生成的历史内容不会自动消失。
        </p>
        <Feedback message={actionError} error />
        <div className="mt-5 flex gap-3">
          <Button
            tone="secondary"
            disabled={busy}
            onClick={() => setTarget(null)}
          ><X size={16} aria-hidden="true" className="control-icon"/>
            取消
          </Button>
          <Button tone="danger" disabled={busy} onClick={revoke}><ShieldOff size={16} aria-hidden="true" className="control-icon"/>
            {busy ? "正在撤回…" : "确认撤回授权"}
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
      <div className="memory-switch flex flex-wrap gap-3" aria-label="记录与授权区域">
        <Button
          aria-pressed={tab === "private"}
          tone={tab === "private" ? "primary" : "secondary"}
          onClick={() => setTab("private")}
        ><PenLine size={16} aria-hidden="true" className="control-icon"/>
          私人记录
        </Button>
        <Button
          aria-pressed={tab === "role"}
          tone={tab === "role" ? "primary" : "secondary"}
          onClick={() => setTab("role")}
        ><Sparkles size={16} aria-hidden="true" className="control-icon"/>
          角色记忆
        </Button>
      </div>
      {tab === "private" ? <PrivateTimeline /> : <MemoryList />}
    </div>
  );
}
