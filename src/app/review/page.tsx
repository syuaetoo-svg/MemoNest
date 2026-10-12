import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
import { ReviewWorkspace } from "@/components/core/ai";
import { AccessGate } from "@/components/core/access-gate";
import { SessionBoundary } from "@/components/core/session-boundary";
import { accountState } from "@/lib/server/supabase";
import { aiConfigured } from "@/lib/server/ai-provider";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "回望生活" };
export default async function ReviewPage() {
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="LITTLE MOMENTS, TOGETHER"
        title="回头看，生活有迹可循"
        description="选几个真实发生的片刻，看看它们连在一起的样子。每一段回顾，都能回到原记录。"
      />
      {state.kind === "authenticated" ? (
        <SessionBoundary key={state.userId} userId={state.userId}>
          <ReviewWorkspace configured={aiConfigured()} />
        </SessionBoundary>
      ) : (
        <AccessGate state={state} returnTo="/review" />
      )}
    </>
  );
}
