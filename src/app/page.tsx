import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronRight, History, Infinity as InfinityIcon, LockKeyhole, Plus, Search, Sparkles, UserRound } from "lucide-react";
import { JournalTimeline } from "@/components/core/journal";
import { ChatWorkspace } from "@/components/core/ai";
import { SessionBoundary } from "@/components/core/session-boundary";
import { accountState } from "@/lib/server/supabase";
import { aiConfigured } from "@/lib/server/ai-provider";
import { ReferenceOverview } from "@/components/reference-overview";
import { ReferenceAsset } from "@/components/reference-assets";
import "./overview.css";
export const dynamic = "force-dynamic";
export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; demo?: string }> }) {
  const params = await searchParams;
  const referenceDemo = params.demo === "reference";
  const query = typeof params.q === "string" ? params.q.slice(0, 200).trim() : "";
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date()).toUpperCase();
  const state = referenceDemo ? { kind: "anonymous" as const } : await accountState();
  const authenticated = state.kind === "authenticated";
  const content = <>
    <div className="overview-columns">
      <div className="overview-life">
        <div className="overview-intro"><div><p className="overview-kicker">{today}</p><h1>A little space for your everyday.</h1></div><Link href="/journal" className="overview-new"><Plus size={17} aria-hidden="true"/>New entry</Link></div>
        <section className="overview-moments overview-glass" aria-labelledby="moments-title">
          <div className="overview-section-heading"><h2 id="moments-title">Your moments</h2>{!authenticated && <BookOpen size={20} aria-hidden="true"/>}</div>
          {authenticated ? <JournalTimeline key={query} initialQuery={query} presentation="overview"/> : <>
            <div className="overview-tabs"><span>All entries</span><span><LockKeyhole size={13} aria-hidden="true"/>Private by default</span></div>
            <div className="overview-empty"><span className="overview-empty-mark"><BookOpen size={30} strokeWidth={1.2} aria-hidden="true"/></span><h3>A space for your everyday</h3><p>{state.kind === "unavailable" ? "We couldn’t check your session. Try again shortly. Your private entries have not been read." : state.kind === "unconfigured" ? "The journal service is not connected yet. Once connected, sign in to see your entries." : "Sign in to see your saved moments.\nA little moment is enough to begin."}</p><Link className="overview-text-link" href={state.kind === "anonymous" ? "/account?returnTo=%2Fjournal" : "/journal"}>{state.kind === "anonymous" ? "Sign in to your space" : "Open journal"}<ArrowUpRight size={16} aria-hidden="true"/></Link></div>
          </>}
        </section>
        <div className="overview-bottom">
          <Link href="/review" className="overview-glass overview-summary"><div className="overview-section-heading"><h2>A week in moments</h2><ChevronRight size={18} aria-hidden="true"/></div><p>A look at the little moments along the way.</p><div className="overview-week" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day=><span key={day}><i/><small>{day}</small></span>)}</div><span className="overview-card-action"><History size={14} aria-hidden="true"/>Explore reflections</span></Link>
          <Link href="/memories" className="overview-glass overview-memory"><div className="overview-section-heading"><h2>Memory space</h2><ChevronRight size={18} aria-hidden="true"/></div><p>Only what you choose to share.</p><span className="overview-notebook-reference" aria-hidden="true"><ReferenceAsset kind="notebook"/></span><span className="overview-memory-note"><LockKeyhole size={17} aria-hidden="true"/><span>Private by default<small>Share individually. Revoke anytime.</small></span></span><span className="overview-card-action"><Sparkles size={14} aria-hidden="true"/>Manage memories</span></Link>
        </div>
      </div>
      <aside className="overview-chat" aria-labelledby="xiaoqi-title">
        <span className="overview-folder-tab" aria-hidden="true"/>
        <div className="overview-chat-heading"><div><h2 id="xiaoqi-title">Xiaoqi / 小栖</h2><p><span/>Here with you</p></div><Link href="/chat" aria-label="Open chat with Xiaoqi" className="overview-chat-open"><ArrowUpRight size={19}/></Link></div>
        <div className="overview-cat overview-cat-reference" role="img" aria-label="Xiaoqi, a pearl-white translucent cat"><ReferenceAsset kind="cat"/></div>
        {authenticated ? <div className="overview-live-chat"><details className="overview-chat-boundary"><summary>Chat & memory privacy</summary><p>Chat lasts only on this page and clears when you leave or refresh. Requests use your last five messages and relevant authorized summaries, not earlier AI replies. Saving and memory permission are separate.</p></details><ChatWorkspace configured={aiConfigured()} embedded/></div> : <div className="overview-chat-welcome"><p className="overview-bubble">What would you like to remember today?</p><p className="overview-chat-note">A thought, a little moment.<br/>Start wherever you feel comfortable.</p><Link href="/chat" className="overview-composer"><span>Leave a little thought…</span><span><ArrowRight size={22} aria-hidden="true"/></span></Link><p className="overview-login-note">Sign in and consent to AI processing to chat with Xiaoqi.</p></div>}
      </aside>
    </div>
    <footer className="overview-footer"><p><LockKeyhole size={13} aria-hidden="true"/>Your moments. Your choice.</p><Link href="/privacy">Privacy & permissions<ArrowUpRight size={13} aria-hidden="true"/></Link></footer>
  </>;
  return <div className="overview-page" data-reference-demo={referenceDemo || undefined}>
    <header className="overview-header"><Link href="/" className="overview-brand" aria-label="MemoNest home"><InfinityIcon size={48} strokeWidth={1.3} aria-hidden="true"/>MemoNest</Link><nav aria-label="Main navigation">{[["/", "Overview"], ["/journal", "Journal"], ["/memories", "Memories"], ["/review", "Reflections"]].map(([href,label])=><Link key={href} href={href} aria-current={href === "/" ? "page" : undefined}>{label}</Link>)}</nav><div className="overview-account"><form action="/" className="overview-search" role="search"><button type="submit" aria-label="Search entries"><Search size={20} aria-hidden="true"/></button><input name="q" defaultValue={query} maxLength={200} aria-label="Search entries" placeholder="Search your memories…"/></form><Link href="/account" className="overview-avatar" aria-label="Account & sign in"><UserRound size={21} aria-hidden="true"/></Link></div></header>
    {referenceDemo ? <ReferenceOverview/> : authenticated ? <SessionBoundary key={state.userId} userId={state.userId}>{content}</SessionBoundary> : content}
  </div>;
}
