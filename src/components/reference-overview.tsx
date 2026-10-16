"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, ChevronRight, LayoutGrid, List, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import "@/app/reference-overview.css";
import { ReferenceAsset } from "@/components/reference-assets";

const entries = [
  { id: "sea", date: "OCT 16", title: "晚风很舒服", body: "下班后去河边走了一会儿，晚风很舒服，整个人都轻松了。", image: "海边照片素材待提供", saved: true },
  { id: "desk", date: "OCT 15", title: "给自己留一点时间", body: "今天没有特别忙，给自己留了一点时间，喝了一杯喜欢的咖啡，\n看了几页书，感觉很好。", image: "桌面照片素材待提供", saved: false },
];

/** Explicit, isolated reference fixture. No identity, network, AI or persistence. */
export function ReferenceOverview() {
  const [filter, setFilter] = useState("All entries");
  const [view, setView] = useState("list");
  const [menu, setMenu] = useState<string | null>(null);
  const [privateDemo, setPrivateDemo] = useState(true);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("今天终于有时间散步了。");
  const [notice, setNotice] = useState("");
  const rows = entries.filter(entry => filter !== "Saved" || entry.saved);
  function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setMessage(text.trim()); setText("");
    setNotice("Demo message updated. Not saved; no AI request.");
  }
  return <>
    <div className="reference-layout">
      <div className="reference-left">
        <div className="reference-intro"><p>FRIDAY, OCTOBER 16</p><h1>A little space for your everyday.</h1><Link href="/journal" className="reference-new"><Plus size={18} aria-hidden="true"/>New entry</Link></div>
        <section className="reference-moments" aria-labelledby="reference-title">
          <h2 id="reference-title">Your moments</h2>
          <div className="reference-views" aria-label="Entry view"><button aria-label="List view" aria-pressed={view === "list"} onClick={()=>setView("list")}><List size={21}/></button><button aria-label="Grid view" aria-pressed={view === "grid"} onClick={()=>setView("grid")}><LayoutGrid size={20}/></button></div>
          <div className="reference-filters" aria-label="Filter demo entries">{["All entries", "This week", "Saved"].map(label=><button key={label} aria-pressed={filter === label} onClick={()=>setFilter(label)}>{label}</button>)}</div>
          <div className={`reference-entries reference-entries--${view}`}>
            {rows.map(entry=><article key={entry.id} className="reference-entry">
              <div className="reference-photo-missing reference-photo" role="img" aria-label={entry.id === "sea" ? "Demo image: sunset by the sea" : "Demo image: a sunlit desk"}><ReferenceAsset kind={entry.id === "sea" ? "sea" : "desk"}/></div>
              <div className="reference-entry-copy"><p className="reference-entry-date">{entry.date}</p><h3>{entry.title}</h3><p className="reference-entry-body">{entry.body}</p></div>
              <button className="reference-entry-menu" aria-label={`View demo entry: ${entry.title}`} aria-expanded={menu === entry.id} onClick={()=>setMenu(menu === entry.id ? null : entry.id)}><MoreHorizontal size={22}/></button>
              {menu === entry.id && <div className="reference-menu" role="status">Demo entry. Not saved to your account.<Link href="/journal">Write your own entry <ChevronRight size={13}/></Link></div>}
            </article>)}
          </div>
        </section>
        <div className="reference-lower">
          <Link href="/review" className="reference-week"><h2>A week in moments</h2><ChevronRight className="reference-chevron" size={18} aria-hidden="true"/><div className="reference-week-days" aria-hidden="true">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day,i)=><span key={day}><i className={i === 1 || i === 4 ? "is-lilac" : ""}>{i === 0 || i > 4 ? <Sparkles size={8}/> : <b/>}</i><small>{day}</small></span>)}</div></Link>
          <section className="reference-memory"><Link href="/memories" className="reference-memory-heading"><h2>Memory space</h2><ChevronRight size={18} aria-hidden="true"/></Link><p>Only what you choose to share.</p><div className="reference-notebook-missing" role="img" aria-label="Pearl-glass notebook"><ReferenceAsset kind="notebook"/></div><div className="reference-memory-control"><button type="button" role="switch" aria-checked={privateDemo} aria-label="Demo privacy switch; does not change real permissions" onClick={()=>{setPrivateDemo(!privateDemo);setNotice("Demo only. No entry permissions changed.");}}><i/></button><span>{privateDemo ? "Private by default" : "Demo state only"}<small>You’re in control.</small></span></div></section>
        </div>
      </div>
      <aside className="reference-chat" aria-label="Xiaoqi demo panel">
        <div className="reference-chat-back reference-chat-back--one" aria-hidden="true"/><div className="reference-chat-back reference-chat-back--two" aria-hidden="true"/>
        <div className="reference-chat-front" aria-hidden="true"/>
        <div className="reference-chat-heading"><h2>Xiaoqi / 小栖</h2><p><i/>Here with you</p></div>
        <button className="reference-chat-menu" aria-label="About demo chat" onClick={()=>setNotice("Demo chat is not saved and does not call AI. Open Chat for a real conversation.")}><MoreHorizontal size={22}/></button>
        <div className="reference-cat-missing reference-cat-asset" role="img" aria-label="Xiaoqi, a pearl-white translucent cat"><ReferenceAsset kind="cat"/></div>
        <p className="reference-ai-bubble">What would you like to<br/>remember today?</p>
        <p className="reference-user-bubble">{message}</p><time className="reference-message-time">5:48 PM</time>
        <form className="reference-composer" onSubmit={send}><input aria-label="Demo message; no AI request" value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="Leave a little thought…"/><button type="submit" aria-label="Send demo message"><ArrowRight size={25}/></button></form>
      </aside>
    </div>
    <div className="reference-disclosure"><span>Demo data · Not saved · No AI requests</span><Link href="/">Back to your Overview</Link><p role="status">{notice}</p></div>
  </>;
}
