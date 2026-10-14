import { SessionBoundary } from "@/components/core/session-boundary";
import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
import { JournalInspiration } from "@/components/journal-inspiration";
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
          <div className="journal-workspace">
            <EntryEditor key={state.userId} />
            <JournalInspiration />
          </div>
        </SessionBoundary>
      ) : (
        <AccessGate state={state} returnTo="/journal" />
      )}
    </>
  );
}
