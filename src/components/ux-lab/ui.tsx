"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Fault } from "@/lib/ux-lab/fixtures";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ux-panel ${className}`}>{children}</section>;
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <p className={`ux-notice ${error ? "ux-error" : ""}`} role={error ? "alert" : "status"}>{children}</p>;
}
export function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);
  return <dialog ref={ref} className="ux-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="ux-dialog-head"><h2 id={id}>{title}</h2><button type="button" className="ux-button" onClick={onClose} aria-label="关闭对话框">关闭</button></div>
    {children}
  </dialog>;
}

// All requests are local timers. There is no fetch, model SDK or database client.
export function useMockRequest(takeFault: (fault: Fault) => boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  function run(kind: Fault, delay: number, success: () => void, failure: () => void) {
    if (timer.current !== null) return;
    const fail = takeFault(kind);
    setBusy(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setBusy(false);
      if (fail) failure(); else success();
    }, delay);
  }
  function cancel() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
  }
  return { busy, run, cancel };
}
