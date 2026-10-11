import { SessionBoundary } from "@/components/core/session-boundary";
import type { Metadata } from "next";
import { Card, PageHeading } from "@/components/ui";
import { EntryEditor } from "@/components/core/journal";
import { AccessGate } from "@/components/core/access-gate";
import { accountState } from "@/lib/server/supabase";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "生活记录" };
export default async function JournalPage() {
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="LIFE, ONE MOMENT AT A TIME"
        title="把生活，轻轻写下来"
        description="一次散步、一顿晚餐、一个新的决定。先保存给自己，再决定是否单独授权小栖记住。"
      />
      {state.kind === "authenticated" ? (
        <SessionBoundary key={state.userId} userId={state.userId}>
          <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
            <EntryEditor key={state.userId} />
            <Card>
              <p className="eyebrow">一点记录灵感</p>
              <h2 className="mt-3 text-xl font-semibold">不必写得很完整</h2>
              <ul className="mt-6 space-y-5 text-sm leading-7 text-muted">
                <li>今天，什么让你停下了脚步？</li>
                <li>有没有一句话，想留给未来的自己？</li>
                <li>最近的一次小小进步是什么？</li>
              </ul>
              <p className="mt-6 border-t border-line pt-5 text-sm leading-7 text-muted">
                私人保存不需要 AI
                授权。标题可空；成功后可在详情编辑、删除或逐条授权角色摘要。未保存草稿只留在当前页面。
              </p>
            </Card>
          </div>
        </SessionBoundary>
      ) : (
        <AccessGate state={state} returnTo="/journal" />
      )}
    </>
  );
}
