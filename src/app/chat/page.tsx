import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
import { ChatWorkspace } from "@/components/core/ai";
import { AccessGate } from "@/components/core/access-gate";
import { SessionBoundary } from "@/components/core/session-boundary";
import { accountState } from "@/lib/server/supabase";
import { aiConfigured } from "@/lib/server/ai-provider";
import { GlassCompanion } from "@/components/glass-companion";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Chat with Xiaoqi" };
export default async function ChatPage() {
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="WITH XIAOQI"
        title="A little chat with Xiaoqi"
        description="Start with a thought. Keep the moments you want to return to."
      />
      {state.kind === "authenticated" ? (
        <SessionBoundary key={state.userId} userId={state.userId}>
          <ChatWorkspace configured={aiConfigured()} />
        </SessionBoundary>
      ) : (
        <div className="chat-entrance"><div><GlassCompanion state="welcome"/><p className="hero-serif">Here, whenever you need a little company.</p></div><AccessGate state={state} returnTo="/chat" /></div>
      )}
    </>
  );
}
