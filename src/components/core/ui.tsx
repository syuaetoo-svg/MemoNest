"use client";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
export const fieldClass =
  "w-full min-w-0 rounded-xl border border-[#7b877d] bg-surface px-3 py-3 text-base";
export function Button({
  children,
  className = "",
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "danger";
}) {
  const colors =
    tone === "primary"
      ? "bg-sage-dark text-white"
      : tone === "danger"
        ? "border border-[#8a3030] text-[#8a3030] bg-surface"
        : "border border-[#7b877d] bg-surface text-ink";
  return (
    <button
      {...props}
      className={`min-h-11 rounded-xl px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${colors} ${className}`}
    >
      {children}
    </button>
  );
}
export function Feedback({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return message ? (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl p-4 text-sm leading-6 ${error ? "bg-[#fbecec] text-[#8a3030]" : "bg-sage-light text-sage-dark"}`}
    >
      {message}
    </p>
  ) : null;
}
export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    else if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface p-6 text-ink backdrop:bg-ink/30"
    >
      <h2 id={id} className="mb-5 text-xl font-semibold">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
