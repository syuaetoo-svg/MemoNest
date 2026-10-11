"use client";

import { useEffect, useRef, useState } from "react";
import { Leaf, CheckCircle2, ShieldCheck } from "lucide-react";
import { materials, SCRIPT_DELAY_MS, type Experiment, type Variant, type MaterialId, type Fault } from "@/lib/ux-lab/fixtures";
import { useStudy } from "./study";
import { Dialog, Notice, Panel, useMockRequest } from "./ui";

type Phase = "chat" | "draft" | "preview" | "saving" | "saved";
type SavedRecord = { title: string; body: string; date: string; version: number; undoUntil: number };
type Overlay = "suggestion" | "grant" | "revoke" | "delete" | "discard" | null;

export function RecordingLab({ experiment, variant, materialId, takeFault }: { experiment: Exclude<Experiment, "e3">; variant: Variant; materialId: MaterialId; takeFault: (fault: Fault) => boolean }) {
  const material = materials[materialId];
  const manual = experiment === "e1" && variant === "a";
  const study = useStudy();
  const request = useMockRequest(takeFault);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [phase, setPhase] = useState<Phase>(manual ? "draft" : "chat");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState<{ message: string; reply: string }[]>([]);
  const [selected, setSelected] = useState(false);
  const [suggestions, setSuggestions] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState<string>(material.date);
  const [saved, setSaved] = useState<SavedRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  useEffect(() => {
    if (!saved || !saved.undoUntil) return;
    const interval = setInterval(() => setRemaining(Math.max(0, Math.ceil((saved.undoUntil - Date.now()) / 1000))), 200);
    return () => clearInterval(interval);
  }, [saved]);

  function closeOverlay() { setOverlay(null); setError(""); }
  function fail(text: string) { setError(text); study.record("errors"); }
  function send() {
    if (request.busy) return;
    if (!message.trim()) { fail("请先输入虚构素材中的事件，再发送。"); composer.current?.focus(); return; }
    setError(""); composer.current?.blur();
    const snapshot = message.trim();
    request.run("reply", SCRIPT_DELAY_MS, () => {
      setTranscript(previous => [...previous, { message: snapshot, reply: previous.length ? "我们可以继续聊。只有你确认保存，记录才会留下。这仍是固定研究脚本。" : material.reply }]);
      setMessage("");
      if (experiment === "e2" && variant !== "c" && suggestions && !hintShown) {
        setHintShown(true);
        if (variant === "a") setOverlay("suggestion"); else setShowCard(true);
      }
      setProgress("固定脚本回复已完成；消息尚未保存为记录。");
    }, () => fail("模拟回复失败。输入没有丢失，可再次发送重试，或改为手动记录。"));
  }
  function openDraft() {
    setTitle(material.title); setBody(material.body); setDate(material.date);
    setEditing(false); setOverlay(null); setShowCard(false); setPhase("draft"); setError("");
    setProgress("这是来自虚构素材的固定候选，不是对你输入内容的 AI 提取。请校对和编辑。");
  }
  function ignore() {
    closeOverlay(); setShowCard(false); setSelected(false); study.evidence("ignored");
    setProgress("已选择继续聊天。没有保存私人记录，也没有授权角色长期记忆。");
  }
  function preview() {
    if (!body.trim() || !date) { fail("请填写记录正文和事件日期；标题可以留空。"); return; }
    setError(""); setPhase("preview"); setProgress("预览尚未保存，请检查正文、日期与权限。");
  }
  function save() {
    if (request.busy) return;
    setPhase("saving"); setError("");
    const previous = saved;
    const draft = { title: title.trim(), body: body.trim(), date };
    request.run("save", 550, () => {
      const isEdit = editing && previous !== null;
      setSaved({ ...draft, version: isEdit ? previous.version + 1 : 1, undoUntil: isEdit ? previous.undoUntil : Date.now() + 10000 });
      setRemaining(isEdit ? Math.max(0, Math.ceil((previous.undoUntil - Date.now()) / 1000)) : 10); setAuthorized(false); setEditing(false); setPhase("saved");
      study.evidence("private_saved");
      setProgress(isEdit ? "修改已暂存，旧角色授权已失效；需要另行重新授权。" : "私人研究记录已暂存。尚未授权小栖长期记住。刷新或离开此方案会丢失。" );
    }, () => { setPhase("preview"); fail("模拟保存失败，记录未保存。草稿仍在，请重试确认保存。"); });
  }
  function clearRecord(isUndo: boolean) {
    setSaved(null); setAuthorized(false); setRemaining(0); setEditing(false); setOverlay(null);
    setTitle(""); setBody(""); setDate(material.date); setPhase(manual ? "draft" : "chat");
    study.evidence("private_deleted");
    setProgress(isUndo ? "已撤销本次保存；私人记录和角色授权均为空。" : "研究记录已删除，相关模拟角色记忆也已移除。");
  }
  function discard() {
    closeOverlay(); setEditing(false);
    if (editing && saved) { setTitle(saved.title); setBody(saved.body); setDate(saved.date); setPhase("saved"); setProgress("修改已取消，原私人记录与授权未改变。"); }
    else { setTitle(""); setBody(""); setDate(material.date); setPhase(manual ? "draft" : "chat"); setProgress("草稿已放弃，没有保存或授权。你可以重新开始。"); }
    study.evidence("cancelled");
  }
  function memoryAction(grant: boolean) {
    if (!saved || request.busy || (grant && saved.undoUntil > Date.now())) return;
    request.run("memory", 450, () => {
      setAuthorized(grant); closeOverlay(); study.evidence(grant ? "memory_granted" : "memory_revoked");
      setProgress(grant ? "仅模拟授权给小栖：精确的当前内容版本。没有真实 AI 服务或永久存储。" : "模拟角色授权已撤回，私人记录仍保留。已发出的聊天内容不自动删除。");
    }, () => fail(grant ? "模拟授权失败，尚未授权；私人记录仍在。请重试。" : "模拟撤回失败，授权状态未改变。请重试。"));
  }

  return <div className="ux-two-col">
    <aside className="space-y-5"><Panel><span className="ux-chip">统一虚构素材 · {materialId === "meeting" ? "X" : "Y"}</span><h2 className="mt-4 text-xl font-semibold">{material.title}</h2><p className="mt-4 leading-8">{material.brief}</p><p className="mt-5 text-sm text-muted">仅使用这段材料，不输入真实姓名、联系方式或私人经历。所有方案读取同一素材文件。</p></Panel>
      {!manual && <Panel><div className="flex items-center gap-3"><Leaf className="text-sage-dark" aria-hidden="true" /><h2 className="font-semibold">小栖 · 原创虚构角色</h2></div><p className="mt-3 text-sm text-muted">固定研究脚本，不是真实 AI，不分析你的输入。每次模拟回复等待 3 秒，不代表真实模型性能。</p></Panel>}
    </aside>
    <Panel>
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-4"><h2 className="text-xl font-semibold">{phase === "saved" ? "你的研究记录" : manual ? "记录一个片刻" : "和小栖聊一聊"}</h2><span className="ux-chip">仅此页面内存</span></div>
      {progress && <Notice>{progress}</Notice>}
      {error && !overlay && <Notice error>{error}</Notice>}
      {phase === "chat" && <div className="space-y-5">
        {experiment === "e2" && variant !== "c" && <label className="ux-check"><input type="checkbox" checked={suggestions} disabled={request.busy} onChange={event => { setSuggestions(event.target.checked); if (!event.target.checked) setShowCard(false); }} />允许本会话展示保存建议（模拟）。这不保存内容，也不授权长期记忆。</label>}
        {!transcript.length && <p className="py-8 text-center text-muted">从素材里的一个片刻开始吧。</p>}
        {transcript.map((pair, index) => <div key={index} className="space-y-3"><div className="ux-message ux-user-message"><p className="mb-1 text-xs text-muted">你的样例输入</p><p className="whitespace-pre-wrap">{pair.message}</p></div><div className="ux-message"><p className="mb-1 text-xs text-muted">小栖 · 固定脚本</p><p>{pair.reply}</p></div>{index === 0 && showCard && <section className="rounded-2xl border border-sage bg-sage-light p-4" aria-label="未保存建议"><p className="font-medium">这段话可以整理成一条生活记录。</p><p className="mt-1 text-sm">未保存，仅供你确认；不授予长期记忆。</p><div className="ux-actions"><button className="ux-button" type="button" onClick={openDraft}>查看草稿</button><button className="ux-button" type="button" onClick={ignore}>忽略建议</button></div></section>}</div>)}
        {request.busy && <Notice>正在播放固定回复脚本，等待 3 秒。可以停止。</Notice>}
        <form onSubmit={event => { event.preventDefault(); send(); }} noValidate><label className="ux-label" htmlFor="lab-message">讲述素材中的事件</label><textarea ref={composer} id="lab-message" className="ux-field" rows={3} maxLength={2000} value={message} disabled={request.busy} onChange={event => setMessage(event.target.value)} placeholder="只讲述左侧的虚构事件" /><div className="ux-actions"><button className="ux-button ux-primary" disabled={request.busy} type="submit">发送样例消息</button>{request.busy && <button className="ux-button" type="button" onClick={() => { request.cancel(); setProgress("模拟回复已停止，输入仍在，可重试发送。"); }}>停止模拟回复</button>}</div></form>
        {transcript.length > 0 && <section className="border-t border-line pt-4"><label className="ux-check"><input type="checkbox" checked={selected} onChange={event => setSelected(event.target.checked)} />选择样例消息，整理为私人记录</label><div className="ux-actions"><button className="ux-button" type="button" disabled={!selected || request.busy} onClick={openDraft}>整理为记录</button><button className="ux-button" type="button" disabled={request.busy} onClick={ignore}>暂不整理，继续聊天</button></div></section>}
        {error && <button className="ux-button" type="button" onClick={() => { setTitle(""); setBody(""); setPhase("draft"); setError(""); }}>改为手动记录</button>}
      </div>}
      {phase === "draft" && <form className="space-y-5" noValidate onSubmit={event => { event.preventDefault(); preview(); }}>
        {!manual && !editing && <div className="rounded-xl bg-paper p-4"><h3 className="text-sm font-semibold">候选来源 · 固定素材</h3><p className="mt-2 text-sm">{material.body}</p></div>}
        <div><label className="ux-label" htmlFor="lab-title">标题（可留空）</label><input id="lab-title" className="ux-field" maxLength={100} value={title} onChange={event => setTitle(event.target.value)} /></div>
        <div><label className="ux-label" htmlFor="lab-date">事件日期</label><input id="lab-date" className="ux-field" type="date" value={date} onChange={event => setDate(event.target.value)} /></div>
        <div><label className="ux-label" htmlFor="lab-body">记录正文</label><textarea id="lab-body" className="ux-field" rows={6} maxLength={2000} value={body} onChange={event => setBody(event.target.value)} aria-invalid={!!error} aria-describedby={error ? "draft-error" : undefined} /></div>
        <p id="draft-error" className="text-sm text-muted">只保存你确认的事实。下一步仅预览，不授权角色使用。</p>
        {editing && <Notice>确认修改后，旧版本的模拟长期记忆会失效。取消修改会保留原记录。</Notice>}
        <div className="ux-actions"><button className="ux-button ux-primary" type="submit">预览私人记录</button><button className="ux-button" type="button" onClick={() => setOverlay("discard")}>{editing ? "取消修改" : "放弃草稿"}</button></div>
      </form>}
      {(phase === "preview" || phase === "saving") && <div><p className="eyebrow">确认前 · 尚未保存</p><h3 className="mt-3 text-xl font-semibold">{title.trim() || body.trim().slice(0, 24)}</h3><p className="mt-2 text-sm text-muted">{date}</p><p className="mt-5 whitespace-pre-wrap leading-8">{body}</p><Notice><ShieldCheck size={18} className="mr-2 inline" aria-hidden="true" />仅保存为私人研究记录，不让小栖长期记住。</Notice><div className="ux-actions"><button className="ux-button ux-primary" type="button" disabled={request.busy} onClick={save}>{phase === "saving" ? "模拟保存中…" : "确认保存私人记录"}</button><button className="ux-button" type="button" disabled={request.busy} onClick={() => { setError(""); setPhase("draft"); }}>返回编辑</button><button className="ux-button" type="button" onClick={() => { if (request.busy) { request.cancel(); setPhase("preview"); setProgress("模拟保存已取消，仍未保存。可以重试。"); } else setOverlay("discard"); }}>{request.busy ? "取消本次保存" : "放弃草稿"}</button></div></div>}
      {phase === "saved" && saved && <div data-testid="private-record"><div className="flex items-center gap-2 text-sage-dark"><CheckCircle2 size={22} aria-hidden="true" /><h3 className="text-lg font-semibold">私人研究记录已暂存</h3></div><p className="mt-4 text-sm text-muted">{saved.date} · 内容版本 v{saved.version}</p><h4 className="mt-2 text-xl font-semibold">{saved.title || saved.body.slice(0, 24)}</h4><p className="mt-4 whitespace-pre-wrap leading-8">{saved.body}</p><p className="mt-5 rounded-xl bg-paper p-4" data-testid="memory-status">小栖长期记忆：{authorized ? "仅模拟已授权" : "未授权"}。私人保存和角色授权是两个独立动作。</p>
        <div className="ux-actions">{remaining > 0 && <button className="ux-button" type="button" onClick={() => { if (saved.undoUntil > Date.now()) clearRecord(true); else setRemaining(0); }}>撤销本次保存（{remaining} 秒）</button>}<button className="ux-button" type="button" onClick={() => { setTitle(saved.title); setBody(saved.body); setDate(saved.date); setEditing(true); setPhase("draft"); setError(""); }}>编辑私人记录</button><button className="ux-button ux-danger" type="button" onClick={() => setOverlay("delete")}>删除私人研究记录</button></div>
        <div className="mt-6 border-t border-line pt-5"><h4 className="font-semibold">可选：角色长期记忆（仅模拟）</h4><p className="mt-2 text-sm text-muted">10 秒撤销窗口结束后才能另行授权。此原型只改变界面状态，不存在真实 AI 记忆。之后可随时撤回，不删除私人记录。</p><div className="ux-actions">{authorized ? <button className="ux-button" type="button" disabled={request.busy} onClick={() => setOverlay("revoke")}>撤回小栖授权</button> : <button className="ux-button" type="button" disabled={remaining > 0 || request.busy} onClick={() => { if (saved.undoUntil <= Date.now()) setOverlay("grant"); }}>查看长期记忆授权</button>}</div></div>
      </div>}
      <Dialog open={overlay === "suggestion"} title="要把这个片刻整理成记录吗？" onClose={ignore}><p>这是一条未保存的研究候选。查看不等于保存，更不等于授权小栖长期记住。</p><p className="mt-4 rounded-xl bg-paper p-4">{material.body}</p><div className="ux-actions"><button className="ux-button ux-primary" type="button" onClick={openDraft}>查看草稿</button><button className="ux-button" type="button" onClick={ignore}>暂不保存</button></div></Dialog>
      <Dialog open={overlay === "grant" || overlay === "revoke"} title={overlay === "revoke" ? "撤回小栖的长期记忆授权？" : "单独授权给小栖（研究模拟）"} onClose={() => { if (!request.busy) closeOverlay(); }}>
        {overlay === "revoke" ? <p>撤回后角色不再使用这条摘要。私人记录仍保留，历史聊天内容不会自动消失。这只是本页面的模拟。</p> : <><p>仅限小栖、仅限当前 v{saved?.version} 内容，持续到撤回、删除或修改来源。私人记录其他内容不会因此自动进入长期记忆。</p><div className="mt-4 rounded-xl bg-paper p-4"><p className="text-sm font-semibold">将授权的确切内容</p><p className="mt-2 whitespace-pre-wrap">{saved?.body}</p></div></>}
        {error && (overlay === "grant" || overlay === "revoke") && <Notice error>{error}</Notice>}<div className="ux-actions"><button className="ux-button ux-primary" type="button" disabled={request.busy} onClick={() => memoryAction(overlay !== "revoke")}>{overlay === "revoke" ? "确认撤回授权" : "确认授权给小栖（模拟）"}</button><button className="ux-button" type="button" disabled={request.busy} onClick={closeOverlay}>取消，保留当前状态</button></div>
      </Dialog>
      <Dialog open={overlay === "delete"} title="删除私人研究记录？" onClose={closeOverlay}><p>会同时移除这条记录与其模拟角色授权。只影响本页面研究样例；正式页面没有数据变化。</p><div className="ux-actions"><button className="ux-button ux-danger" type="button" onClick={() => clearRecord(false)}>确认删除记录</button><button className="ux-button" type="button" onClick={closeOverlay}>取消删除</button></div></Dialog>
      <Dialog open={overlay === "discard"} title="放弃尚未确认的编辑？" onClose={closeOverlay}><p>{editing ? "未保存的修改会丢失，原记录保持不变。" : "未保存草稿会丢弃，不创建记录或长期记忆。"}</p><div className="ux-actions"><button className="ux-button" type="button" onClick={closeOverlay}>继续编辑</button><button className="ux-button ux-danger" type="button" onClick={discard}>确认放弃草稿</button></div></Dialog>
    </Panel>
  </div>;
}
