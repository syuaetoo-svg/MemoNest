import Link from "next/link";
import { ArrowRight, BookOpen, Heart, MessageCircle, ShieldCheck } from "lucide-react";
import { FeatureLink } from "@/components/ui";
import { GlassCompanion } from "@/components/glass-companion";

export default function HomePage() {
  return <div>
    <section className="hero">
      <div><p className="eyebrow">YOUR LIFE, IN A DIFFERENT LIGHT</p><h1>每一个平凡日子，<br /><span>都值得被记得。</span></h1>
        <p className="hero-description">在记忆小屋，和温柔的伙伴聊聊生活。你可以先写下重要的片刻，保存给自己，再决定是否让角色记住。</p>
        <div className="hero-actions"><Link href="/chat" className="primary-link">认识你的伙伴 <ArrowRight size={16} aria-hidden="true" /></Link><Link href="/journal" className="inline-flex min-h-11 items-center text-sm text-sage-dark underline underline-offset-4">直接记录一个片刻</Link></div>
      </div>
      <div className="hero-art"><GlassCompanion /><p className="hero-art-label">小栖 · XIAOQI<span>让记忆慢慢生长</span></p></div>
    </section>
    <section aria-labelledby="journey-title"><div className="home-section-title"><h2 id="journey-title">从一个小小的片刻开始</h2><span className="text-xs text-muted">陪伴 · 记录 · 回望</span></div>
      <div className="grid gap-4 md:grid-cols-3">
        <FeatureLink href="/chat" title="和小栖聊一聊" description="和原创 AI 伙伴聊聊，再选择原话整理成记录。"><MessageCircle size={22} aria-hidden="true" /></FeatureLink>
        <FeatureLink href="/journal" title="写下今天的生活" description="为日常经历留一个位置，登录后保存属于自己的私人记录。"><BookOpen size={22} aria-hidden="true" /></FeatureLink>
        <FeatureLink href="/memories" title="照看你的记忆" description="回看私人时间线，管理角色的逐条授权。"><Heart size={22} aria-hidden="true" /></FeatureLink>
      </div>
    </section>
    <div className="privacy-ribbon"><ShieldCheck size={19} className="mt-1 shrink-0" aria-hidden="true" /><div><h2 className="text-sm font-medium">你的故事，由你决定是否留下</h2><p className="mt-1 text-xs leading-7">私人记录默认不供角色使用。长期记忆需要单独授权；AI 处理前会说明范围并征得同意，保存与长期授权分开确认。</p></div></div>
  </div>;
}
