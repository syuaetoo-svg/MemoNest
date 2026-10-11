"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search, Sprout } from "lucide-react";
import { sampleRecords, themes, SCRIPT_DELAY_MS, type Theme, type Variant, type Fault, type SampleRecord } from "@/lib/ux-lab/fixtures";
import { useStudy } from "./study";
import { Dialog, Notice, Panel, useMockRequest } from "./ui";

type Filters = { query: string; start: string; end: string };
const emptyFilters: Filters = { query: "", start: "", end: "" };

export function ReviewLab({ variant, takeFault }: { variant: Variant; takeFault: (fault: Fault) => boolean }) {
  const study = useStudy();
  const request = useMockRequest(takeFault);
  const [query, setQuery] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [theme, setTheme] = useState<Theme | "全部">("全部");
  const [selectedThemes, setSelectedThemes] = useState<Theme[]>([]);
  const [processingConsent, setProcessingConsent] = useState(false);
  const [storyReady, setStoryReady] = useState(false);
  const [source, setSource] = useState<SampleRecord | null>(null);
  const [chosen, setChosen] = useState<SampleRecord | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const isStory = variant === "c";
  const records = useMemo(() => sampleRecords.filter(record => {
    if (isStory && !selectedThemes.includes(record.theme)) return false;
    if (variant === "b" && theme !== "全部" && record.theme !== theme) return false;
    if (filters.start && record.date < filters.start) return false;
    if (filters.end && record.date > filters.end) return false;
    const text = `${record.title} ${record.body} ${record.theme}`;
    return !filters.query || text.includes(filters.query);
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [filters, isStory, selectedThemes, theme, variant]);

  function applyFilters() {
    if (start && end && start > end) { setError("开始日期不能晚于结束日期，请修改后重试。"); study.record("errors"); return; }
    setFilters({ query: query.trim(), start, end }); setError(""); setChosen(null); setProgress("");
  }
  function generate() {
    if (request.busy) return;
    if (!selectedThemes.length || !processingConsent) { setError("请选择虚构样例范围，并明确同意模拟本次处理；这不授予长期记忆。"); study.record("errors"); return; }
    setError("");
    request.run("review", SCRIPT_DELAY_MS, () => {
      setStoryReady(true); setProgress("固定故事卡已就绪。每一条事件都可以打开原始虚构记录；没有调用 AI。"); study.evidence("review_ready");
    }, () => { setStoryReady(false); setError("模拟回顾失败。范围选择仍在，可重试；没有生成或保存新内容。"); study.record("errors"); });
  }
  function abandon() {
    request.cancel(); setStoryReady(false); setProcessingConsent(false); setFilters(emptyFilters); setQuery(""); setStart(""); setEnd(""); setChosen(null); setSource(null); setError("");
    setProgress("模拟回顾已放弃，没有保存故事卡，也没有授权长期记忆。可以重新选择范围重试。"); study.evidence("cancelled");
  }
  function chooseSource() {
    if (!source) return;
    setChosen(source); setSource(null); study.evidence("source_selected", source.id);
    setProgress(`已选择来源 ${source.id}。请向研究员指出任务要求的细节；选择来源不等于答案一定正确。`);
  }
  function recordButton(record: SampleRecord, story = false) {
    return <button key={record.id} type="button" className={story ? "ux-button mt-3" : "ux-record-button"} onClick={() => setSource(record)} aria-label={`查看来源：${record.title}`}>
      {story ? <>打开来源 · {record.id}</> : <><span className="block text-sm text-muted">{record.date} · {record.theme} · {record.id}</span><span className="mt-2 block text-lg font-semibold">{record.title}</span><span className="mt-2 block text-sm leading-7 text-muted">{record.body}</span></>}
    </button>;
  }

  return <div className="space-y-5">
    <Panel><div className="flex items-center gap-3"><BookOpen className="text-sage-dark" aria-hidden="true" /><h2 className="text-xl font-semibold">四月的生活片刻</h2><span className="ux-chip">12 条统一虚构记录</span></div><p className="mt-3 text-sm text-muted">不是你的个人记忆。三种方案共用同一组记录，没有“学会潜水”的事件。找回任务请打开来源，而不是只看摘要。</p></Panel>
    {isStory && !storyReady && <Panel><span className="ux-chip">固定研究样例 · 并非真实 AI</span><h2 className="mt-4 text-xl font-semibold">选择这次想回看的片刻</h2><p className="mt-3 text-sm text-muted">只是播放预先编写的故事卡，不读取正式产品记录。正式对照任务使用全部 12 条统一样例。</p><fieldset className="mt-4" disabled={request.busy}><legend className="text-sm font-semibold">本次模拟回顾范围</legend>{themes.map(value => <label key={value} className="ux-check"><input type="checkbox" checked={selectedThemes.includes(value)} onChange={event => setSelectedThemes(previous => event.target.checked ? [...previous, value] : previous.filter(item => item !== value))} />{value} · 4 条虚构记录</label>)}<button className="ux-button" type="button" onClick={() => setSelectedThemes([...themes])}>选用全部 12 条样例</button><label className="ux-check mt-3"><input type="checkbox" checked={processingConsent} onChange={event => setProcessingConsent(event.target.checked)} />同意模拟本次回顾，仅使用选中的虚构样例；不授权角色长期记忆。</label></fieldset><div className="ux-actions"><button className="ux-button ux-primary" type="button" disabled={request.busy} onClick={generate}>{request.busy ? "正在播放样例…" : error ? "重试模拟回顾" : "查看固定故事卡"}</button><button className="ux-button" type="button" onClick={abandon}>{request.busy ? "停止模拟回顾" : "取消本次回顾"}</button></div>{request.busy && <Notice>固定等待 3 秒，可停止；这不是模型推理。</Notice>}</Panel>}
    {error && <Notice error>{error}</Notice>}
    {progress && <Notice>{progress}</Notice>}
    {(!isStory || storyReady) && <>
      <Panel><form noValidate onSubmit={event => { event.preventDefault(); applyFilters(); }}><div className="grid gap-4 sm:grid-cols-3"><div><label className="ux-label" htmlFor="review-query">关键词</label><input id="review-query" className="ux-field" type="search" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} placeholder="例如：会议、相机" /></div><div><label className="ux-label" htmlFor="review-start">开始日期</label><input id="review-start" className="ux-field" type="date" value={start} onChange={event => setStart(event.target.value)} /></div><div><label className="ux-label" htmlFor="review-end">结束日期</label><input id="review-end" className="ux-field" type="date" value={end} onChange={event => setEnd(event.target.value)} /></div></div><div className="ux-actions"><button className="ux-button ux-primary" type="submit"><Search size={16} className="mr-2 inline" aria-hidden="true" />查找记录</button><button className="ux-button" type="button" onClick={() => { setFilters(emptyFilters); setQuery(""); setStart(""); setEnd(""); setTheme("全部"); setError(""); setProgress(""); setChosen(null); }}>清除筛选</button>{isStory && <button className="ux-button" type="button" onClick={abandon}>放弃故事卡，返回选择</button>}</div></form>
        {variant === "b" && <div className="ux-actions" aria-label="主题分类">{(["全部", ...themes] as const).map(value => <button key={value} className={`ux-button ${theme === value ? "ux-primary" : ""}`} type="button" aria-pressed={theme === value} onClick={() => { setTheme(value); setChosen(null); setProgress(""); }}>{value}</button>)}</div>}
        <p className="mt-4 text-sm text-muted" role="status">当前匹配 {records.length} 条真实存在的研究样例{isStory ? "（仅本次选择范围）" : ""}。</p>
      </Panel>
      {chosen && <Notice>来源已选择：{chosen.id} · {chosen.title}。正确与否请按任务核对，可继续查找。</Notice>}
      {!records.length ? <Panel><div className="py-8 text-center"><Sprout size={32} className="mx-auto text-sage-dark" aria-hidden="true" /><h2 className="mt-4 text-xl font-semibold">没有匹配的研究记录</h2><p className="mt-3 text-sm text-muted">请检查筛选与范围，不会用故事补出不存在的经历。</p><button className="ux-button mt-5" type="button" onClick={() => { study.evidence("no_match_confirmed"); setProgress("已确认当前条件没有匹配。研究员仍需核对是否查找了任务指定范围。"); }}>确认未找到匹配记录</button></div></Panel> : isStory ? <div className="ux-grid">{themes.filter(value => records.some(record => record.theme === value)).map(value => <Panel key={value}><span className="ux-chip">固定研究故事 · {value}</span><h2 className="my-4 text-xl font-semibold">{value === "工作" ? "工作中的几个片刻" : value === "朋友" ? "和朋友一起留下的事" : "慢慢走过的小路"}</h2><p className="mb-3 text-sm text-muted">以下事实来自所列虚构来源，不推断心情或人生因果。</p>{records.filter(record => record.theme === value).map(record => <div key={record.id} className="ux-story-claim"><p className="text-sm text-muted">{record.date}</p><p className="mt-2 leading-7">{record.body}</p>{recordButton(record, true)}</div>)}</Panel>)}</div> : <div className="space-y-4" aria-label={variant === "a" ? "时间线记录" : "主题记录"}>{records.map(record => recordButton(record))}</div>}
    </>}
    <Dialog open={source !== null} title="虚构原始记录 · 来源详情" onClose={() => setSource(null)}>{source && <><p className="text-sm text-muted">{source.id} · {source.date} · {source.theme}</p><h3 className="mt-3 text-xl font-semibold">{source.title}</h3><p className="mt-5 leading-8">{source.body}</p><p className="mt-4 text-sm text-muted">固定研究样例，不是 AI 生成事实。请对照任务指出相关细节。</p><div className="ux-actions"><button className="ux-button ux-primary" type="button" onClick={chooseSource}>标记为找到的来源</button><button className="ux-button" type="button" onClick={() => setSource(null)}>返回继续查找</button></div></>}</Dialog>
  </div>;
}
