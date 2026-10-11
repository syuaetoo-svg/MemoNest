"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { experiments, materials, taskIds, taskLabels, variantName, type Experiment, type Variant, type TaskId, type MaterialId, type Fault } from "@/lib/ux-lab/fixtures";
import { useStudy, StudyToolbar } from "./study";
import { Dialog, Notice } from "./ui";
import { RecordingLab } from "./recording";
import { ReviewLab } from "./review";

export function ExperimentRunner({ experiment, variant }: { experiment: Experiment; variant: Variant }) {
  const study = useStudy();
  const [taskId, setTaskId] = useState<TaskId>(taskIds(experiment)[0]);
  const [materialId, setMaterialId] = useState<MaterialId>("meeting");
  const [resetKey, setResetKey] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [fault, setFault] = useState<Fault>("none");
  const faultRef = useRef<Fault>("none");
  const [notice, setNotice] = useState("");
  const config = { experiment, variant, materialId: experiment === "e3" ? "review-set-1" : materialId, taskId };
  function takeFault(kind: Fault) {
    if (faultRef.current !== kind) return false;
    faultRef.current = "none"; setFault("none"); study.markFault(); return true;
  }
  function resetPrototype() {
    setResetKey(value => value + 1); faultRef.current = "none"; setFault("none"); setNotice("");
  }
  function leave(event: React.MouseEvent<HTMLAnchorElement>) {
    if (study.active) {
      event.preventDefault(); setNotice("任务计时仍在运行。请先在研究员工具中结束并记录（可选取消），再返回实验目录。");
    }
  }
  return <div className="space-y-6"><header><Link href="/ux-lab" onClick={leave} className="ux-button inline-flex">← 返回实验目录</Link><p className="eyebrow mt-6">{experiment.toUpperCase()} · 方案 {variant.toUpperCase()}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{variantName(experiment, variant)}</h1><p className="mt-3 text-muted">{experiments[experiment].question}</p></header>
    <StudyToolbar config={config} onStart={resetPrototype}>
      <div className="grid gap-3 sm:grid-cols-2"><label>本轮任务<select className="ux-field mt-1" value={taskId} disabled={study.active} onChange={event => { setTaskId(event.target.value as TaskId); resetPrototype(); }}>{taskIds(experiment).map(id => <option value={id} key={id}>{taskLabels[id]}</option>)}</select></label>{experiment !== "e3" && <label>统一素材<select className="ux-field mt-1" disabled={study.active} value={materialId} onChange={event => { setMaterialId(event.target.value as MaterialId); resetPrototype(); }}>{Object.entries(materials).map(([id, material]) => <option key={id} value={id}>{material.title}</option>)}</select></label>}</div>
      <label className="block">故障演练（只影响下一次对应操作）<select className="ux-field mt-1" value={fault} onChange={event => { const next = event.target.value as Fault; setFault(next); faultRef.current = next; }}><option value="none">正常流程</option>{experiment !== "e3" && <><option value="reply">下一次模拟回复失败</option><option value="save">下一次私人保存失败</option><option value="memory">下一次授权或撤回失败</option></>}{experiment === "e3" && variant === "c" && <option value="review">下一次模拟回顾失败</option>}</select></label>
      <button className="ux-button" type="button" disabled={study.active} onClick={() => setConfirmReset(true)}>重置当前原型</button>
    </StudyToolbar>
    <div className="rounded-2xl border border-line bg-clay-light px-5 py-4"><p className="text-sm font-semibold">本轮任务</p><p className="mt-1">{taskLabels[taskId]}</p><p className="mt-2 text-sm text-muted">虚构材料，非个人经历。界面进展不会自动结束计时或判定正确。</p></div>
    {notice && <Notice error>{notice}</Notice>}
    <div className="ux-prototype" data-testid="prototype-area" onClickCapture={() => study.record("clicks")} onFocusCapture={() => study.record("focusChanges")} onInputCapture={event => { const characters = (event.nativeEvent as InputEvent).data?.length ?? 0; /* Defer counters until controlled fields have processed onChange. Only a number is retained. */ queueMicrotask(() => { study.record("inputEvents"); if (characters) study.record("enteredCharacters", characters); }); }}>
      <div key={`${experiment}-${variant}-${materialId}-${resetKey}-${study.revision}`}>
        {experiment === "e3" ? <ReviewLab variant={variant} takeFault={takeFault} /> : <RecordingLab experiment={experiment} variant={variant} materialId={materialId} takeFault={takeFault} />}
      </div>
    </div>
    <Dialog open={confirmReset} title="重置当前研究原型？" onClose={() => setConfirmReset(false)}><p>会丢弃此方案的输入、私人研究记录和模拟授权，不删除已经结束的匿名任务记录。</p><div className="ux-actions"><button className="ux-button" type="button" onClick={() => setConfirmReset(false)}>取消重置</button><button className="ux-button ux-danger" type="button" onClick={() => { resetPrototype(); setConfirmReset(false); }}>确认重置原型</button></div></Dialog>
  </div>;
}
