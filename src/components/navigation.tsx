"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, House, MessageCircle, Sparkles, History } from "lucide-react";
import { navigation } from "@/lib/navigation";

const icons = { home: House, chat: MessageCircle, journal: BookOpen, memories: Sparkles };

export function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="主导航" className="floating-nav">
      {navigation.map(({ href, label, icon }) => {
        const Icon = href === "/review" ? History : icons[icon];
        const active = pathname === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className="nav-item">
            <Icon size={17} aria-hidden="true" /><span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
