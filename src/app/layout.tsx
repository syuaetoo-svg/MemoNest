import type { Metadata } from "next";
import Link from "next/link";
import { Infinity, UserRound } from "lucide-react";
import { Navigation } from "@/components/navigation";
import "./globals.css";
import "./fonts.css";
import "./reference-theme.css";

export const metadata: Metadata = {
  title: { default: "MemoNest", template: "%s · MemoNest" },
  description: "A private journal with an AI companion. Keep your moments and choose what to share.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <header className="site-header"><div className="header-inner">
      <Link href="/" className="brand" aria-label="MemoNest home"><Infinity size={46} strokeWidth={1.4} aria-hidden="true"/><span className="brand-name">MemoNest</span></Link>
      <div className="header-actions"><Navigation /><Link href="/account" className="account-link"><UserRound size={15} aria-hidden="true" />Account / Sign in</Link></div>
    </div></header>
    <main id="main-content" className="site-main">{children}</main>
    <footer className="site-footer"><p>MemoNest · Keep your little moments</p><p>AI companion · Private journal · Optional memories</p></footer>
  </body></html>;
}
