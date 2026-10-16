import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { GlassCompanion } from "./glass-companion";
import { GlassSurface } from "./glass";

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="page-heading"><p className="eyebrow mb-3">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-4 max-w-2xl leading-7 text-muted">{description}</p></header>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <GlassSurface className={`p-6 sm:p-8 ${className}`}>{children}</GlassSurface>;
}

export function FeatureLink({ href, title, description, children }: { href: string; title: string; description: string; children: ReactNode }) {
  return <Link href={href} className="group glass-feature p-6"><div className="mb-6 flex items-center justify-between"><span className="feature-icon">{children}</span><ArrowUpRight size={18} className="text-muted transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" /></div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{description}</p></Link>;
}

export function PhaseNotice() {
  return <p className="flex items-start gap-2 rounded-2xl bg-paper px-4 py-3 text-sm leading-6 text-muted"><LockKeyhole size={16} className="mt-1 shrink-0" aria-hidden="true" />Write on your own or consent to AI processing for this request. Saving and memory permission are separate.</p>;
}

export function EmptyState({ title, description, showCompanion = true }: { title: string; description: string; showCompanion?: boolean }) {
  return <div className="empty-state flex min-h-64 flex-col items-center justify-center px-4 py-10 text-center">{showCompanion && <GlassCompanion size="small" />}<h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 max-w-md text-sm leading-7 text-muted">{description}</p></div>;
}
