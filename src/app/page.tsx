import Link from "next/link";
import { ArrowUpRight, BookOpen, MessageCircle, ShieldCheck, PawPrint, LockKeyhole, Sparkles } from "lucide-react";
import { GlassCompanion } from "@/components/glass-companion";
export default function HomePage() {
  return <div className="home-universe">
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">MEMONEST / YOUR LITTLE UNIVERSE</p>
        <h1>把小小的日常，<br/><span>藏进温柔的宇宙。</span></h1>
        <p className="hero-serif">Some moments deserve to stay.</p>
        <p className="hero-description">一段随意的倾诉，一个舍不得忘的瞬间。<br/>和小栖一起，让生活慢慢有迹可循。</p>
        <div className="hero-actions"><Link href="/chat" className="primary-link"><PawPrint size={16} aria-hidden="true"/>和小栖聊聊</Link><Link href="/journal" className="hero-secondary"><BookOpen size={16} aria-hidden="true"/>直接记录一个片刻</Link></div>
        <p className="hero-footnote"><LockKeyhole aria-hidden="true"/> 私人记录，始终由你掌握</p>
      </div>
      <div className="hero-art">

        <div className="cat-stage"><GlassCompanion state="welcome"/></div>
        <div className="cat-greeting">嗨，我是小栖。<span>今天，想留下什么？</span></div>
        <p className="hero-art-label">小栖 <span> XIAOQI / 安静陪你记录</span></p>

      </div>
    </section>
    <section className="moment-path" aria-labelledby="journey-title">
      <div className="path-intro"><p className="eyebrow">MAKE ROOM FOR LIFE</p><h2 id="journey-title">生活的碎片，<br/>都有一个落点。</h2><p>从此刻开始，就很好。</p></div>
      <Link href="/chat" className="path-link"><span className="path-number">01 / CONNECT</span><MessageCircle size={24}/><h3>说给小栖听</h3><p>不必想好开场白，<br/>一点心事也值得被倾听。</p><ArrowUpRight className="path-arrow" size={19}/></Link>
      <Link href="/journal" className="path-link"><span className="path-number">02 / KEEP</span><BookOpen size={24}/><h3>留住一个瞬间</h3><p>写下日常的小小波澜，<br/>保存属于自己的生活记录。</p><ArrowUpRight className="path-arrow" size={19}/></Link>
      <Link href="/memories" className="path-link"><span className="path-number">03 / REMEMBER</span><Sparkles size={24} aria-hidden="true"/><h3>照看你的记忆</h3><p>回望生活的片段，<br/>决定哪些可以让小栖记住。</p><ArrowUpRight className="path-arrow" size={19} aria-hidden="true"/></Link>
    </section>
    <div className="privacy-ribbon"><ShieldCheck size={18}/><p>你的故事，由你决定。<span> 私人保存与长期记忆授权分别确认，随时可以撤回授权。</span></p><Link href="/privacy">了解隐私边界 <ArrowUpRight size={13}/></Link></div>
  </div>;
}
