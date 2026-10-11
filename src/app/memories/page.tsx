import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, EmptyState, PageHeading, PhaseNotice } from "@/components/ui";

export const metadata: Metadata = { title: "记忆管理" };
export default function MemoriesPage() {
  return <><PageHeading eyebrow="ROOM FOR YOUR MEMORIES" title="留住片刻，也留住自己" description="未来，经你授权保存的生活经历将在这里整理成时间线，陪你回望走过的日子。" /><Card><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5"><h2 className="text-lg font-semibold">个人记忆时间线</h2><span className="rounded-full bg-sage-light px-3 py-1 text-xs text-sage-dark">数据服务尚未接入</span></div><EmptyState title="记忆小屋，等待你的第一段故事" description="当前没有接入记忆存储，也没有预置虚构的个人记忆。保存、搜索、删除和 AI 回顾将在后续阶段逐步实现。" /><div className="flex justify-center"><Link href="/journal" className="primary-link">了解生活记录 <ArrowRight size={16} aria-hidden="true" /></Link></div></Card><div className="mt-5 grid gap-4 sm:grid-cols-3">{[{ title: "由你授权", text: "未来每一次进入记忆的内容，都需要你的明确选择。" }, { title: "按时间整理", text: "未来可以沿着时间线，找回生活里的重要片刻。" }, { title: "由你管理", text: "查看、删除与回顾能力将逐步加入，让记忆保持可控。" }].map(item => <Card key={item.title}><h2 className="text-base font-semibold">{item.title}</h2><p className="mt-3 text-sm leading-7 text-muted">{item.text}</p></Card>)}</div><div className="mt-5"><PhaseNotice /></div></>;
}
