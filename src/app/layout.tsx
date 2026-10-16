import type { Metadata } from "next";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { GlassCompanion } from "@/components/glass-companion";
import "./globals.css";
import "./fonts.css";
import "./airy-glass.css";

export const metadata: Metadata = {
  title: { default: "MemoNest · 记忆小屋", template: "%s · MemoNest" },
  description: "以原创 AI 角色陪伴为入口，让经你授权的生活经历成为可以回望的个人记忆。",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <a href="#main-content" className="skip-link">跳到主要内容</a>
    <header className="site-header"><div className="header-inner">
      <Link href="/" className="brand" aria-label="MemoNest 记忆小屋首页"><GlassCompanion size="mark" /><span><span className="brand-name">MemoNest</span><span className="brand-note">给生活一个温柔的落点</span></span></Link>
      <div className="header-actions"><Navigation /><Link href="/account" className="account-link"><UserRound size={15} aria-hidden="true" />账号 / 登录</Link></div>
    </div></header>
    <main id="main-content" className="site-main">{children}</main>
    <footer className="site-footer"><p>MemoNest · 留住你愿意留下的生活</p><p>AI 陪伴 · 私人记录 · 授权记忆</p></footer>
  </body></html>;
}
