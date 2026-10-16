import { SessionBoundary } from "@/components/core/session-boundary";
import { PageHeading } from "@/components/ui";
import { MemoryWorkspace } from "@/components/core/memories";
import { AccessGate } from "@/components/core/access-gate";
import { accountState } from "@/lib/server/supabase";
export const dynamic = "force-dynamic";
export const metadata = { title: "Memories" };
export default async function MemoriesPage() {
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="ROOM FOR YOUR MEMORIES"
        title="Keep your little moments"
        description="Your journal and Xiaoqi’s memories stay separate. Revisit an entry or withdraw permission at any time."
      />
      {state.kind === "authenticated" ? (
        <SessionBoundary key={state.userId} userId={state.userId}>
          <MemoryWorkspace />
        </SessionBoundary>
      ) : (
        <AccessGate state={state} returnTo="/memories" />
      )}
    </>
  );
}
