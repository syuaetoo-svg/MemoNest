import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function GlassSurface({ children, className = "", material = "reading", ...props }: HTMLAttributes<HTMLElement> & { material?: "reading" | "peach" | "dark" }) {
  return <section {...props} className={`glass-panel glass-surface--${material} ${className}`}>{children}</section>;
}

export function GlassButton({ children, className = "", tone = "primary", icon, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "danger"; icon?: ReactNode }) {
  return <button {...props} className={`glass-button glass-button--${tone} ${className}`}>{icon}{children}</button>;
}
