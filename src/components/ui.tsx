import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, LockKeyhole, Sprout } from "lucide-react";

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="mb-8"><p className="eyebrow mb-3">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-4 max-w-2xl leading-7 text-muted">{description}</p></header>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-surface p-6 sm:p-8 ${className}`}>{children}</section>;
}

export function FeatureLink({ href, title, description, children }: { href: string; title: string; description: string; children: ReactNode }) {
  return <Link href={href} className="group rounded-3xl border border-line bg-surface p-6 transition-colors hover:border-sage"><div className="mb-6 flex items-center justify-between"><span className="rounded-2xl bg-paper p-3 text-sage-dark">{children}</span><ArrowUpRight size={20} className="text-muted transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" /></div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{description}</p></Link>;
}

export function PhaseNotice() {
  return <p className="flex items-start gap-2 rounded-2xl bg-paper px-4 py-3 text-sm leading-6 text-muted"><LockKeyhole size={16} className="mt-1 shrink-0" aria-hidden="true" />第一阶段 · 界面与项目基础已建立。AI 回复、数据保存与回顾尚未接入。</p>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center px-4 py-10 text-center"><span className="mb-5 rounded-full bg-sage-light p-5 text-sage-dark"><Sprout size={30} aria-hidden="true" /></span><h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 max-w-md text-sm leading-7 text-muted">{description}</p></div>;
}
