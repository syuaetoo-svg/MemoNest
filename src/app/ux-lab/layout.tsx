import type { ReactNode } from "react";
import type { Metadata } from "next";
import { StudyProvider, StudyArchive } from "@/components/ux-lab/study";
import styles from "./lab.module.css";

export const metadata: Metadata = { title: "UX Lab · 研究原型", robots: { index: false, follow: false } };
export default function LabLayout({ children }: { children: ReactNode }) {
  return <div className={styles.lab}><div className="mb-7 rounded-2xl border border-sage bg-sage-light px-5 py-4 text-sm leading-7"><strong>UX Lab · 研究原型，不是正式产品功能。</strong><p>仅用虚构素材；回复、候选和故事均为固定脚本。无真实 AI、数据库或数据上传。输入与模拟保存仅在当前页面内存中，离开或刷新会丢失。</p></div><StudyProvider>{children}<StudyArchive /></StudyProvider></div>;
}
