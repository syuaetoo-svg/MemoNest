"use client";
import { RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Entry } from "@/lib/core/contracts";
import type { ReviewResult } from "@/lib/core/review";
import { messageOf, useCoreApi } from "@/lib/core/client";
import { Card } from "@/components/ui";
import { Button, Feedback } from "./ui";

export function JournalReview({ entry }: { entry: Entry }) {
  const api = useCoreApi();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => () => {
    generation.current++;
    controller.current?.abort();
  }, []);
  function clear() {
    generation.current++;
    controller.current?.abort();
    setBusy(false);
    setConsent(false);
    setResult(null);
    setError("");
    setNotice("回顾已停止或清除；原记录及长期记忆授权未改变。已发送给服务商的内容无法收回。");
  }
  async function generate() {
    if (!consent) return;
    const current = ++generation.current;
    controller.current = new AbortController();
    setBusy(true);
    setResult(null);
    setError("");
    setNotice("");
    try {
      const data = await api<ReviewResult>("/api/ai/review", "POST", {
        entryId: entry.id, expectedVersion: entry.version, processingConsent: true,
      }, controller.current.signal);
      if (current === generation.current) setResult(data);
    } catch (e) {
      if (current === generation.current) setError(messageOf(e));
    } finally {
      if (current === generation.current) { setBusy(false); setConsent(false); }
    }
  }
  return (
    <Card className="single-review">
      <p className="eyebrow">ONE MOMENT, LOOKED AT AGAIN</p>
      <h2 className="my-3 text-xl font-semibold">重新看看这个片刻</h2>
      <p className="mb-4 text-sm leading-7 text-muted">
        仅回顾这篇日记，最多整理三个有原文依据的片刻。需要服务端配置真实 AI，未配置或失败时不会展示模拟回复。
      </p>
      <div className="mb-4 rounded-2xl bg-paper p-4 text-sm leading-7">
        本次处理范围：{entry.event_date} · {entry.title || "当前私人记录"} · 版本 {entry.version}。
        将把标题、日期和正文发送给 OpenAI；供应商可能按其政策保留请求，不能承诺零留存。
        本站不持久化回顾、不建立角色长期记忆，不读取其他日记。
      </div>
      <label className="mb-4 flex items-start gap-3 text-sm leading-7">
        <input className="mt-2 h-5 w-5 shrink-0 accent-sage-dark" type="checkbox"
          checked={consent} disabled={busy}
          onChange={(e) => { setConsent(e.target.checked); setError(""); }} />
        我同意把这篇记录交给 OpenAI 做本次回顾，这不等于长期记忆授权。
      </label>
      <div className="mb-4 flex flex-wrap gap-3">
        <Button disabled={!consent || busy || entry.body.length > 6000} onClick={generate}><RefreshCw size={16} aria-hidden="true" className="control-icon"/>
          {busy ? "正在回顾…" : error ? "重新确认并重试" : "生成本次回顾"}
        </Button>
        {(busy || result || consent) && <Button tone="secondary" onClick={clear}><X size={16} aria-hidden="true" className="control-icon"/>
          {busy ? "停止回顾" : "清除回顾与当次选择"}
        </Button>}
      </div>
      {entry.body.length > 6000 && <Feedback message="此篇超过 6000 字符，暂不支持 AI 回顾；原文仍可正常查看。" />}
      {busy && <p className="mb-4 text-sm text-muted" role="status">正在请求真实模型，约 25 秒超时；可随时停止。</p>}
      <Feedback message={error} error />
      <Feedback message={notice} />
      {result && <section className="mt-5 space-y-4" aria-label="本次 AI 回顾">
        <p className="text-sm text-muted">AI 生成 · 仅来自本篇版本 {result.source.version} · 可能有误，请对照原文；刷新后清除。</p>
        {result.moments.map((moment, index) => <div key={index} className="rounded-2xl border border-line p-4">
          <p className="whitespace-pre-wrap break-words leading-7">{moment.text}</p>
          <blockquote className="mt-3 border-l-2 border-sage pl-3 text-sm leading-7 text-muted">
            原文依据：“{moment.quote}”
          </blockquote>
        </div>)}
        <p className="text-sm text-muted">来源：上方当前日记正文；没有保存新的事实或授权。</p>
      </section>}
    </Card>
  );
}
