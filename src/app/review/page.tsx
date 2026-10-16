import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
import { ReviewWorkspace } from "@/components/core/ai";
import { AccessGate } from "@/components/core/access-gate";
import { SessionBoundary } from "@/components/core/session-boundary";
import { accountState } from "@/lib/server/supabase";
import { aiConfigured } from "@/lib/server/ai-provider";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reflections" };
export default async function ReviewPage() {
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="LITTLE MOMENTS, TOGETHER"
        title="A look back at your moments"
        description="Choose a few entries and see what connects them. Every reflection links back to its sources."
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
