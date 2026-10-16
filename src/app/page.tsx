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
          <div className="overview-section-heading"><h2 id="moments-title">Your moments</h2><BookOpen size={20} aria-hidden="true"/></div>
          {authenticated ? <JournalTimeline key={query} initialQuery={query}/> : <>
            <div className="overview-tabs"><span>All entries</span><span><LockKeyhole size={13} aria-hidden="true"/>Private by default</span></div>
            <div className="overview-empty"><span className="overview-empty-mark"><BookOpen size={30} strokeWidth={1.2} aria-hidden="true"/></span><h3>给日常，留一点位置</h3><p>{state.kind === "unavailable" ? "暂时无法验证会话，请稍后重试。没有读取你的私人内容。" : state.kind === "unconfigured" ? "记录服务尚未连接。连接后登录，即可在这里查看自己的生活片段。" : "登录后，你保存的生活片段会出现在这里。\n一个小小的瞬间，就值得被留下。"}</p><Link className="overview-text-link" href={state.kind === "anonymous" ? "/account?returnTo=%2Fjournal" : "/journal"}>{state.kind === "anonymous" ? "Sign in to your space" : "Open journal"}<ArrowUpRight size={16} aria-hidden="true"/></Link></div>
          </>}
        </section>
        <div className="overview-bottom">
          <Link href="/review" className="overview-glass overview-summary"><div className="overview-section-heading"><h2>A week in moments</h2><ChevronRight size={18} aria-hidden="true"/></div><p>回望那些，慢慢积累的小小日常。</p><div className="overview-week" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day=><span key={day}><i/><small>{day}</small></span>)}</div><span className="overview-card-action"><History size={14} aria-hidden="true"/>Explore reflections</span></Link>
          <Link href="/memories" className="overview-glass overview-memory"><div className="overview-section-heading"><h2>Memory space</h2><ChevronRight size={18} aria-hidden="true"/></div><p>Only what you choose to share.</p><span className="overview-notebook-reference" aria-hidden="true"><ReferenceAsset kind="notebook"/></span><span className="overview-memory-note"><LockKeyhole size={17} aria-hidden="true"/><span>默认私人保存<small>逐条授权，随时撤回。</small></span></span><span className="overview-card-action"><Sparkles size={14} aria-hidden="true"/>Manage memories</span></Link>
        </div>
      </div>
      <aside className="overview-chat" aria-labelledby="xiaoqi-title">
        <span className="overview-folder-tab" aria-hidden="true"/>
        <div className="overview-chat-heading"><div><h2 id="xiaoqi-title">Xiaoqi / 小栖</h2><p><span/>Here with you</p></div><Link href="/chat" aria-label="打开与小栖的完整对话" className="overview-chat-open"><ArrowUpRight size={19}/></Link></div>
        <div className="overview-cat overview-cat-reference" role="img" aria-label="小栖，珍珠白半透明小猫"><ReferenceAsset kind="cat"/></div>
        {authenticated ? <div className="overview-live-chat"><details className="overview-chat-boundary"><summary>关于对话与记忆</summary><p>当前页临时对话，离开或刷新会清除。发送时使用最近 5 条用户表达和相关有效授权摘要；历史 AI 回复不会再次发送。私人保存与长期记忆授权分别确认。</p></details><ChatWorkspace configured={aiConfigured()}/></div> : <div className="overview-chat-welcome"><p className="overview-bubble">What would you like to remember today?</p><p className="overview-chat-note">一点心事，一件小事。<br/>从你愿意分享的地方开始。</p><Link href="/chat" className="overview-composer"><span>Leave a little thought…</span><span><ArrowRight size={22} aria-hidden="true"/></span></Link><p className="overview-login-note">登录并确认当次 AI 处理后，即可与小栖聊天。</p></div>}
      </aside>
    </div>
    <footer className="overview-footer"><p><LockKeyhole size={13} aria-hidden="true"/>你的记录，由你决定。</p><Link href="/privacy">Privacy & permissions<ArrowUpRight size={13} aria-hidden="true"/></Link></footer>
  </>;
  return <div className="overview-page" data-reference-demo={referenceDemo || undefined}>
    <header className="overview-header"><Link href="/" className="overview-brand" aria-label="MemoNest 首页"><InfinityIcon size={48} strokeWidth={1.3} aria-hidden="true"/>MemoNest</Link><nav aria-label="主导航">{[["/", "Overview"], ["/journal", "Journal"], ["/memories", "Memories"], ["/review", "Reflections"]].map(([href,label])=><Link key={href} href={href} aria-current={href === "/" ? "page" : undefined}>{label}</Link>)}</nav><div className="overview-account"><form action="/" className="overview-search" role="search"><button type="submit" aria-label="搜索生活记录"><Search size={20} aria-hidden="true"/></button><input name="q" defaultValue={query} maxLength={200} aria-label="搜索生活记录" placeholder="Search your memories…"/></form><Link href="/account" className="overview-avatar" aria-label="账号与登录"><UserRound size={21} aria-hidden="true"/></Link></div></header>
    {referenceDemo ? <ReferenceOverview/> : authenticated ? <SessionBoundary key={state.userId} userId={state.userId}>{content}</SessionBoundary> : content}
  </div>;
}
