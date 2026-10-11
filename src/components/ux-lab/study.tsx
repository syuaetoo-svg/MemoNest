"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PROTOTYPE_VERSION, RESULTS_STORAGE_KEY, sampleRecords, taskIds, variantName, type Experiment, type Variant, type TaskId } from "@/lib/ux-lab/fixtures";
import { Dialog, Notice } from "./ui";

type Outcome = "independent" | "assisted" | "failed" | "cancelled" | "timeout";
type Evidence = "none" | "private_saved" | "private_deleted" | "ignored" | "cancelled" | "source_selected" | "no_match_confirmed" | "review_ready" | "memory_granted" | "memory_revoked";
type Understanding = "unassessed" | "correct" | "incorrect" | "unclear";
type Severity = "unassessed" | "S0" | "S1" | "S2" | "S3";
type Category = "none" | "expression" | "interruption" | "privacy" | "retrieval" | "feedback";
type Counter = "clicks" | "focusChanges" | "inputEvents" | "enteredCharacters" | "errors";
type Counters = Record<Counter, number>;
export type RunConfig = { experiment: Experiment; variant: Variant; materialId: string; taskId: TaskId };
type Assessment = { outcome: Outcome; disturbance: number | null; cognitiveLoad: number | null; understanding: Understanding; severity: Severity; category: Category };
type TaskResult = RunConfig & Assessment & Counters & { runId: string; sessionId: string; prototypeVersion: string; elapsedMs: number; pausedMs: number; evidence: Evidence; sourceId: string | null; faultInjected: boolean };
type Run = { config: RunConfig; startedAt: number; segmentStart: number | null; accumulatedMs: number; counters: Counters; evidence: Evidence; sourceId: string | null; faultInjected: boolean };
const zeroCounters = (): Counters => ({ clicks: 0, focusChanges: 0, inputEvents: 0, enteredCharacters: 0, errors: 0 });
const newId = (prefix: string) => `${prefix}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, "0").toUpperCase()}`;
const elapsed = (run: Run) => run.accumulatedMs + (run.segmentStart === null ? 0 : performance.now() - run.segmentStart);

// This allowlist rebuilds rows instead of trusting arbitrary localStorage fields.
function parseResults(value: unknown): TaskResult[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error("invalid archive");
  const inSet = <T extends string>(input: unknown, allowed: readonly T[]): T => {
    if (typeof input !== "string" || !allowed.includes(input as T)) throw new Error("invalid enum");
    return input as T;
  };
  const number = (input: unknown, max = 1e9): number => {
    if (typeof input !== "number" || !Number.isFinite(input) || input < 0 || input > max) throw new Error("invalid number");
    return input;
  };
  const rating = (input: unknown, max: number) => input === null ? null : number(input, max) >= 1 && Number.isInteger(input) ? input as number : (() => { throw new Error("invalid rating"); })();
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("invalid row");
    const row = item as Record<string, unknown>;
    const experiment = inSet(row.experiment, ["e1", "e2", "e3"] as const);
    const variant = inSet(row.variant, ["a", "b", "c"] as const);
    if (!variantName(experiment, variant)) throw new Error("invalid variant");
    const taskId = inSet(row.taskId, taskIds(experiment));
    const materialId = inSet(row.materialId, experiment === "e3" ? ["review-set-1"] : ["meeting", "walk"]);
    if (typeof row.runId !== "string" || !/^RUN-[A-F0-9]{8}$/.test(row.runId) || typeof row.sessionId !== "string" || !/^LAB-[A-F0-9]{8}$/.test(row.sessionId) || row.prototypeVersion !== PROTOTYPE_VERSION) throw new Error("invalid metadata");
    if (typeof row.faultInjected !== "boolean") throw new Error("invalid fault marker");
    if (row.sourceId !== null && !sampleRecords.some(record => record.id === row.sourceId)) throw new Error("invalid source");
    return {
      experiment, variant, taskId, materialId, runId: row.runId, sessionId: row.sessionId, prototypeVersion: PROTOTYPE_VERSION,
      outcome: inSet(row.outcome, ["independent", "assisted", "failed", "cancelled", "timeout"] as const),
      disturbance: rating(row.disturbance, 5), cognitiveLoad: rating(row.cognitiveLoad, 7),
      understanding: inSet(row.understanding, ["unassessed", "correct", "incorrect", "unclear"] as const),
      severity: inSet(row.severity, ["unassessed", "S0", "S1", "S2", "S3"] as const),
      category: inSet(row.category, ["none", "expression", "interruption", "privacy", "retrieval", "feedback"] as const),
      elapsedMs: number(row.elapsedMs), pausedMs: number(row.pausedMs),
      evidence: inSet(row.evidence, ["none", "private_saved", "private_deleted", "ignored", "cancelled", "source_selected", "no_match_confirmed", "review_ready", "memory_granted", "memory_revoked"] as const),
      sourceId: row.sourceId as string | null, faultInjected: row.faultInjected,
      clicks: number(row.clicks), focusChanges: number(row.focusChanges), inputEvents: number(row.inputEvents), enteredCharacters: number(row.enteredCharacters), errors: number(row.errors),
    };
  });
}

type StudyContextValue = {
  consent: boolean; active: boolean; paused: boolean; elapsedMs: number; counters: Counters; results: TaskResult[]; revision: number;
  setConsent: (consent: boolean) => void;
  start: (config: RunConfig) => void; pause: () => void; finish: (assessment: Assessment) => void;
  record: (counter: Counter, amount?: number) => void; evidence: (value: Evidence, sourceId?: string) => void;
  reset: () => void; load: () => void; save: () => void; exportResults: () => void; newSession: () => void;
  archiveStatus: string; markFault: () => void;
};
const StudyContext = createContext<StudyContextValue | null>(null);
export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error("UX Lab study provider missing");
  return context;
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState(false);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [counters, setCounters] = useState<Counters>(zeroCounters);
  const [results, setResults] = useState<TaskResult[]>([]);
  const [revision, setRevision] = useState(0);
  const [archiveStatus, setArchiveStatus] = useState("");
  const [navigationWarning, setNavigationWarning] = useState("");
  const run = useRef<Run | null>(null);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    if (!active || paused) return;
    const interval = setInterval(() => { if (run.current) { setElapsedMs(elapsed(run.current)); setCounters({ ...run.current.counters }); } }, 250);
    return () => clearInterval(interval);
  }, [active, paused]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (run.current) { event.preventDefault(); event.returnValue = ""; }
    }
    function warnNavigation(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!run.current || !anchor || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin === window.location.origin && target.pathname === window.location.pathname) return;
      event.preventDefault(); event.stopPropagation();
      setNavigationWarning("任务计时仍在运行。请先暂停、结束并记录任务（可以选择取消），再离开研究方案。");
    }
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", warnNavigation, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", warnNavigation, true); };
  }, []);

  function start(config: RunConfig) {
    if (!consent || run.current) return;
    sessionId.current ??= newId("LAB");
    const now = performance.now();
    run.current = { config, startedAt: now, segmentStart: now, accumulatedMs: 0, counters: zeroCounters(), evidence: "none", sourceId: null, faultInjected: false };
    setNavigationWarning(""); setActive(true); setPaused(false); setElapsedMs(0); setCounters(zeroCounters());
  }
  function pause() {
    if (!run.current) return;
    if (run.current.segmentStart !== null) {
      run.current.accumulatedMs = elapsed(run.current); run.current.segmentStart = null; setPaused(true);
    } else { run.current.segmentStart = performance.now(); setPaused(false); }
    setElapsedMs(elapsed(run.current)); setCounters({ ...run.current.counters });
  }
  function finish(assessment: Assessment) {
    const current = run.current;
    if (!current || !sessionId.current) return;
    const duration = elapsed(current);
    const row: TaskResult = { ...current.config, ...assessment, ...current.counters, runId: newId("RUN"), sessionId: sessionId.current, prototypeVersion: PROTOTYPE_VERSION, elapsedMs: Math.round(duration), pausedMs: Math.max(0, Math.round(performance.now() - current.startedAt - duration)), evidence: current.evidence, sourceId: current.sourceId, faultInjected: current.faultInjected };
    setResults(previous => [...previous, row]);
    run.current = null; setNavigationWarning(""); setActive(false); setPaused(false); setElapsedMs(duration); setCounters({ ...current.counters });
    setArchiveStatus("任务记录已结束，仅在当前浏览器内存中。研究员的结果判定不是自动研究结论。");
  }
  function record(counter: Counter, amount = 1) {
    const current = run.current;
    if (!current || current.segmentStart === null) return;
    current.counters[counter] += Math.max(0, amount);
  }
  function evidence(value: Evidence, sourceId?: string) {
    if (!run.current || run.current.segmentStart === null) return;
    run.current.evidence = value;
    run.current.sourceId = sourceId && sampleRecords.some(record => record.id === sourceId) ? sourceId : null;
  }
  function markFault() { if (run.current) run.current.faultInjected = true; }
  function reset() {
    run.current = null; sessionId.current = null;
    setResults([]); setNavigationWarning(""); setActive(false); setPaused(false); setConsent(false); setElapsedMs(0); setCounters(zeroCounters()); setRevision(value => value + 1);
    try { localStorage.removeItem(RESULTS_STORAGE_KEY); setArchiveStatus("当前匿名结果和浏览器存档已清除，原型已重置。已下载的文件需要你自行删除。"); }
    catch { setArchiveStatus("内存和原型已清除；浏览器拒绝访问存储，无法确认旧本地存档已删除，请检查浏览器站点存储。"); }
  }
  function load() {
    if (run.current || !window.confirm("载入会替换当前内存中的匿名任务结果。继续吗？")) return;
    try {
      const stored = localStorage.getItem(RESULTS_STORAGE_KEY);
      if (!stored) { setArchiveStatus("此浏览器没有 UX Lab 匿名存档。"); return; }
      setResults(parseResults(JSON.parse(stored))); setArchiveStatus("已载入匿名结果；不会恢复私人记录、聊天正文或研究同意。");
    } catch { setArchiveStatus("存档不可读取或格式不符合当前版本，当前内存结果未被覆盖。"); }
  }
  function save() {
    try { localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(parseResults(results))); setArchiveStatus("只保存匿名任务元数据到本浏览器；不包含聊天、搜索词或正文。"); }
    catch { setArchiveStatus("浏览器本地保存失败，内存结果仍在；可尝试下载 JSON。"); }
  }
  function exportResults() {
    try {
      const blob = new Blob([JSON.stringify({ schemaVersion: 1, prototypeVersion: PROTOTYPE_VERSION, results: parseResults(results) }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "memonest-ux-anonymous-results.json";
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setArchiveStatus("已请求下载匿名 JSON。请妥善保管，仅含任务元数据，不代表研究结论。");
    } catch { setArchiveStatus("导出失败，内存结果仍在，请重试。"); }
  }
  function newSession() {
    if (run.current) return;
    sessionId.current = null; setConsent(false); setRevision(value => value + 1); setArchiveStatus("已准备新的匿名会话；之前已结束的任务结果保留，需重新取得研究同意。");
  }
  return <StudyContext.Provider value={{ consent, active, paused, elapsedMs, counters, results, revision, setConsent, start, pause, finish, record, evidence, reset, load, save, exportResults, newSession, archiveStatus, markFault }}>{navigationWarning && <Notice error>{navigationWarning}</Notice>}{children}</StudyContext.Provider>;
}

const outcomeNames: Record<Outcome, string> = { independent: "独立完成", assisted: "协助完成", failed: "失败", cancelled: "取消", timeout: "超时" };

export function StudyToolbar({ config, onStart, children }: { config: RunConfig; onStart: () => void; children?: ReactNode }) {
  const study = useStudy();
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [disturbance, setDisturbance] = useState<number | null>(null);
  const [cognitiveLoad, setCognitiveLoad] = useState<number | null>(null);
  const [understanding, setUnderstanding] = useState<Understanding>("unassessed");
  const [severity, setSeverity] = useState<Severity>("unassessed");
  const [category, setCategory] = useState<Category>("none");
  const maxSeconds = config.experiment === "e1" ? 180 : config.experiment === "e3" ? 90 : config.taskId === "manage" ? 360 : 120;
  function begin() {
    if (!study.consent || study.active) return;
    onStart(); setOutcome(""); setDisturbance(null); setCognitiveLoad(null); setUnderstanding("unassessed"); setSeverity("unassessed"); setCategory("none"); study.start(config);
  }
  return <details className="ux-research" data-research-controls><summary>研究员工具 · 计时与故障演练</summary><div className="space-y-4 pt-3">
    <p>仅在你明确开始后统计。此处不录屏、不上传数据、不记录输入文字。任务限时参考 {maxSeconds} 秒；超过时限需人工结束并选“超时”，不会冒充实际完成时间。</p>
    <label className="ux-check"><input type="checkbox" checked={study.consent} disabled={study.active} onChange={event => study.setConsent(event.target.checked)} />已说明研究性质并取得匿名计时与计数同意（不等于长期记忆授权）</label>
    {children}
    <div className="ux-actions"><button type="button" className="ux-button ux-primary" disabled={!study.consent || study.active} onClick={begin}>开始任务计时</button><button type="button" className="ux-button" disabled={!study.active} onClick={study.pause}>{study.paused ? "继续计时" : "暂停计时"}</button><button type="button" className="ux-button" disabled={!study.active || study.paused} onClick={() => study.record("errors")}>标记一次观察错误</button></div>
    <p role="status" className="font-medium">{study.active ? study.paused ? "计时已暂停" : "计时中" : "计时未运行"} · {(study.elapsedMs / 1000).toFixed(1)} 秒 · 自动点击 {study.counters.clicks} · 错误 {study.counters.errors}{study.active && study.elapsedMs / 1000 > maxSeconds ? " · 已超过参考时限" : ""}</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label>任务结果<select className="ux-field mt-1" value={outcome} onChange={event => setOutcome(event.target.value as Outcome | "")}><option value="">请人工判定</option>{Object.entries(outcomeNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
      <label>打扰感（1–5）<select className="ux-field mt-1" value={disturbance ?? ""} onChange={event => setDisturbance(event.target.value ? Number(event.target.value) : null)}><option value="">未询问</option>{[1, 2, 3, 4, 5].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>认知负担（1–7）<select className="ux-field mt-1" value={cognitiveLoad ?? ""} onChange={event => setCognitiveLoad(event.target.value ? Number(event.target.value) : null)}><option value="">未询问</option>{[1, 2, 3, 4, 5, 6, 7].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>权限理解<select className="ux-field mt-1" value={understanding} onChange={event => setUnderstanding(event.target.value as Understanding)}><option value="unassessed">未检查</option><option value="correct">首次复述正确</option><option value="incorrect">存在误解</option><option value="unclear">无法判断</option></select></label>
      <label>问题严重性<select className="ux-field mt-1" value={severity} onChange={event => setSeverity(event.target.value as Severity)}><option value="unassessed">未评估</option><option value="S0">S0 隐私/权限</option><option value="S1">S1 核心任务阻断</option><option value="S2">S2 费力</option><option value="S3">S3 表达偏好</option></select></label>
      <label>问题类别<select className="ux-field mt-1" value={category} onChange={event => setCategory(event.target.value as Category)}><option value="none">未分类</option><option value="expression">表达与编辑</option><option value="interruption">打扰</option><option value="privacy">权限</option><option value="retrieval">找回</option><option value="feedback">反馈与恢复</option></select></label>
    </div>
    <button type="button" className="ux-button ux-primary" disabled={!study.active || !outcome} onClick={() => { if (outcome) study.finish({ outcome, disturbance, cognitiveLoad, understanding, severity, category }); }}>结束并记录任务</button>
    <p className="text-sm text-muted">按钮点击只表示界面进展，正确正文、来源、权限及“成功”必须由研究员核对；失败与取消也要结束记录。故障演练与正式比较分开。</p>
  </div></details>;
}

export function StudyArchive() {
  const study = useStudy();
  const [confirmReset, setConfirmReset] = useState(false);
  return <aside className="ux-research mt-8" data-research-controls><details><summary>匿名任务记录 · {study.results.length} 条（不是参与人数）</summary><div className="space-y-4 pt-4">
    <p>默认仅存在内存，刷新后丢失。可明确保存匿名元数据到本浏览器，或下载 JSON。私人正文和虚构保存结果都不在存档中，也不会恢复到正式页面。共享设备使用后请清除。</p>
    <div className="ux-actions"><button className="ux-button" type="button" disabled={study.active} onClick={study.save}>保存匿名结果到此浏览器</button><button className="ux-button" type="button" disabled={study.active} onClick={study.load}>载入匿名结果</button><button className="ux-button" type="button" disabled={study.active} onClick={study.exportResults}>下载匿名 JSON</button><button className="ux-button" type="button" disabled={study.active} onClick={study.newSession}>新的匿名会话</button><button className="ux-button ux-danger" type="button" onClick={() => setConfirmReset(true)}>撤回研究同意并清空</button></div>
    {study.archiveStatus && <Notice>{study.archiveStatus}</Notice>}
    <ol className="space-y-3">{study.results.map(row => <li key={row.runId} className="rounded-xl bg-surface p-3 text-sm">{row.sessionId} · {row.experiment.toUpperCase()}/{row.variant.toUpperCase()} · {outcomeNames[row.outcome]} · {(row.elapsedMs / 1000).toFixed(1)} 秒 · 错误 {row.errors} · 界面进展 {row.evidence}</li>)}</ol>
  </div></details>
    <Dialog open={confirmReset} title="清除研究数据与原型状态？" onClose={() => setConfirmReset(false)}><p>会终止未结束的计时，删除本浏览器的匿名存档和内存结果，并清空原型。已经下载的文件需要你自行删除。正式产品页面不受影响。</p><div className="ux-actions"><button className="ux-button" type="button" onClick={() => setConfirmReset(false)}>保留数据</button><button className="ux-button ux-danger" type="button" onClick={() => { study.reset(); setConfirmReset(false); }}>确认清空研究数据</button></div></Dialog>
  </aside>;
}
