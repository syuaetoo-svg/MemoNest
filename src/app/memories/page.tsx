import { SessionBoundary } from "@/components/core/session-boundary";
import { PageHeading } from "@/components/ui";
import { MemoryWorkspace } from "@/components/core/memories";
import { AccessGate } from "@/components/core/access-gate";
import { accountState } from "@/lib/server/supabase";
export const dynamic = "force-dynamic";
export const metadata = { title: "记忆管理" };
export default async function MemoriesPage() {
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="ROOM FOR YOUR MEMORIES"
        title="留住片刻，也留住自己"
        description="私人时间线与小栖的角色记忆分开管理。你可以回看原文，也可以随时撤回角色使用权限。"
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
