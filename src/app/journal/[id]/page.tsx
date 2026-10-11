import { SessionBoundary } from "@/components/core/session-boundary";
import { PageHeading } from "@/components/ui";
import { EntryDetail } from "@/components/core/journal";
import { AccessGate } from "@/components/core/access-gate";
import { accountState } from "@/lib/server/supabase";
import { uuid } from "@/lib/core/contracts";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "记录详情",
  robots: { index: false, follow: false },
};
export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="A MOMENT, YOURS TO KEEP"
        title="照看这个片刻"
        description="原记录留给自己；让角色使用的摘要需要另一次明确授权。"
      />
      {state.kind === "authenticated" ? (
        <SessionBoundary key={`${state.userId}:${id}`} userId={state.userId}>
          <EntryDetail id={id} />
        </SessionBoundary>
      ) : (
        <AccessGate state={state} returnTo={`/journal/${id}`} />
      )}
    </>
  );
}
