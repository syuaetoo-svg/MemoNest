import { SessionBoundary } from "@/components/core/session-boundary";
import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
import { JournalInspiration } from "@/components/journal-inspiration";
import { EntryEditor } from "@/components/core/journal";
import { AccessGate } from "@/components/core/access-gate";
import { accountState } from "@/lib/server/supabase";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Journal" };
export default async function JournalPage() {
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="LIFE, ONE MOMENT AT A TIME"
        title="A moment to keep"
        description="Save a moment for yourself. Choose separately what Xiaoqi may remember."
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
