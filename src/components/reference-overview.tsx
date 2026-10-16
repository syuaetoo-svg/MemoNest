"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, ChevronRight, LayoutGrid, List, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import "@/app/reference-overview.css";

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
    setNotice("仅更新演示气泡，未保存、未调用 AI。");
  }
  return <>
    <div className="reference-layout">
      <div className="reference-left">
        <div className="reference-intro"><p>FRIDAY, OCTOBER 16</p><h1>A little space for your everyday.</h1><Link href="/journal" className="reference-new"><Plus size={18} aria-hidden="true"/>New entry</Link></div>
        <section className="reference-moments" aria-labelledby="reference-title">
          <h2 id="reference-title">Your moments</h2>
          <div className="reference-views" aria-label="记录显示方式"><button aria-label="列表视图" aria-pressed={view === "list"} onClick={()=>setView("list")}><List size={21}/></button><button aria-label="网格视图" aria-pressed={view === "grid"} onClick={()=>setView("grid")}><LayoutGrid size={20}/></button></div>
          <div className="reference-filters" aria-label="筛选演示记录">{["All entries", "This week", "Saved"].map(label=><button key={label} aria-pressed={filter === label} onClick={()=>setFilter(label)}>{label}</button>)}</div>
          <div className={`reference-entries reference-entries--${view}`}>
            {rows.map(entry=><article key={entry.id} className="reference-entry">
              <div className="reference-photo-missing" role="img" aria-label={entry.image}><span>{entry.image}</span></div>
              <div className="reference-entry-copy"><p className="reference-entry-date">{entry.date}</p><h3>{entry.title}</h3><p className="reference-entry-body">{entry.body}</p></div>
              <button className="reference-entry-menu" aria-label={`查看演示记录：${entry.title}`} aria-expanded={menu === entry.id} onClick={()=>setMenu(menu === entry.id ? null : entry.id)}><MoreHorizontal size={22}/></button>
              {menu === entry.id && <div className="reference-menu" role="status">演示记录，不会保存到账号。<Link href="/journal">写下自己的记录 <ChevronRight size={13}/></Link></div>}
            </article>)}
          </div>
        </section>
        <div className="reference-lower">
          <Link href="/review" className="reference-week"><h2>A week in moments</h2><ChevronRight className="reference-chevron" size={18} aria-hidden="true"/><div className="reference-week-days" aria-hidden="true">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day,i)=><span key={day}><i className={i === 1 || i === 4 ? "is-lilac" : ""}>{i === 0 || i > 4 ? <Sparkles size={8}/> : <b/>}</i><small>{day}</small></span>)}</div></Link>
          <section className="reference-memory"><Link href="/memories" className="reference-memory-heading"><h2>Memory space</h2><ChevronRight size={18} aria-hidden="true"/></Link><p>Only what you choose to share.</p><div className="reference-notebook-missing" role="img" aria-label="半透明手帐本素材待提供"><span>手帐素材待提供</span></div><div className="reference-memory-control"><button type="button" role="switch" aria-checked={privateDemo} aria-label="演示隐私开关，不更改实际授权" onClick={()=>{setPrivateDemo(!privateDemo);setNotice("这是演示开关，没有更改任何记录授权。");}}><i/></button><span>{privateDemo ? "Private by default" : "Demo state only"}<small>You’re in control.</small></span></div></section>
        </div>
      </div>
      <aside className="reference-chat" aria-label="小栖演示面板">
        <div className="reference-chat-back reference-chat-back--one" aria-hidden="true"/><div className="reference-chat-back reference-chat-back--two" aria-hidden="true"/>
        <div className="reference-chat-front" aria-hidden="true"/>
        <div className="reference-chat-heading"><h2>Xiaoqi / 小栖</h2><p><i/>Here with you</p></div>
        <button className="reference-chat-menu" aria-label="演示对话说明" onClick={()=>setNotice("演示对话不会调用 AI 或保存。真实对话请打开 /chat。")}><MoreHorizontal size={22}/></button>
        <div className="reference-cat-missing" role="img" aria-label="参考图小猫的透明背景素材待提供"><span>小栖透明素材待提供</span></div>
        <p className="reference-ai-bubble">What would you like to<br/>remember today?</p>
        <p className="reference-user-bubble">{message}</p><time className="reference-message-time">5:48 PM</time>
        <form className="reference-composer" onSubmit={send}><input aria-label="演示消息，不会调用 AI" value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="Leave a little thought…"/><button type="submit" aria-label="发送演示消息"><ArrowRight size={25}/></button></form>
      </aside>
    </div>
    <div className="reference-disclosure"><span>演示数据 · 不保存、不调用 AI · 图片占位待原始素材</span><Link href="/">返回真实首页</Link><p role="status">{notice}</p></div>
  </>;
}
