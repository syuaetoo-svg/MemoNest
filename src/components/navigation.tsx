"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, House, MessageCircle, Sprout } from "lucide-react";
import { navigation } from "@/lib/navigation";

const icons = { home: House, chat: MessageCircle, journal: BookOpen, memories: Sprout };

export function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="主导航" className="flex w-full gap-1 md:w-auto md:gap-2">
      {navigation.map(({ href, label, icon }) => {
        const Icon = icons[icon];
        const active = pathname === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${active ? "bg-sage-light text-sage-dark" : "text-muted hover:bg-paper hover:text-ink"}`}>
            <Icon size={17} aria-hidden="true" /><span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
