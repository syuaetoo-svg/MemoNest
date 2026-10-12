import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
import { ChatWorkspace } from "@/components/core/ai";
import { AccessGate } from "@/components/core/access-gate";
import { SessionBoundary } from "@/components/core/session-boundary";
import { accountState } from "@/lib/server/supabase";
import { aiConfigured } from "@/lib/server/ai-provider";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "和小栖聊聊" };
export default async function ChatPage() {
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE COMPANY"
        title="和小栖，慢慢聊"
        description="不必组织好语言。聊聊今天，再把想留下的片刻，变成属于自己的生活记录。"
      />
      {state.kind === "authenticated" ? (
        <SessionBoundary key={state.userId} userId={state.userId}>
          <ChatWorkspace configured={aiConfigured()} />
        </SessionBoundary>
      ) : (
        <AccessGate state={state} returnTo="/chat" />
      )}
    </>
  );
}
