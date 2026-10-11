import type { Metadata } from "next";
import Link from "next/link";
import { Sprout } from "lucide-react";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MemoNest · 记忆小屋", template: "%s · MemoNest" },
  description: "以原创 AI 角色陪伴为入口，让经你授权的生活经历成为可以回望的个人记忆。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a href="#main-content" className="skip-link">跳到主要内容</a><header className="border-b border-line bg-surface"><div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between"><Link href="/" className="flex w-fit items-center gap-3" aria-label="MemoNest 记忆小屋首页"><span className="rounded-2xl bg-sage-light p-3 text-sage-dark"><Sprout size={24} aria-hidden="true" /></span><span><span className="block text-xl font-semibold tracking-tight">MemoNest<span className="ml-2 text-xs font-normal text-muted">记忆小屋</span></span><span className="mt-1 block text-xs tracking-widest text-muted">给生活一个温柔的落点</span></span></Link><div className="flex flex-col gap-2 md:items-end"><Navigation /><Link href="/account" className="inline-flex min-h-11 items-center self-end px-3 text-sm text-sage-dark underline">账号 / 登录</Link></div></div></header><main id="main-content" className="mx-auto min-h-[75vh] max-w-6xl px-5 py-9 sm:py-12">{children}</main><footer className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-line px-5 py-6 text-xs leading-6 text-muted sm:flex-row sm:justify-between"><p>MemoNest · 留住你愿意留下的生活</p><p>核心记录与授权管理 · AI 对话尚未开放</p></footer></body></html>;
}
