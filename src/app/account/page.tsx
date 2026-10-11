import { PageHeading } from "@/components/ui";
import { AccountForm, SignedInAccount } from "@/components/core/account";
import { AccessGate } from "@/components/core/access-gate";
import { accountState } from "@/lib/server/supabase";
export const dynamic = "force-dynamic";
export const metadata = { title: "账号" };
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const query = await searchParams;
  const target = query.returnTo;
  const returnTo =
    target &&
    (/^\/journal(?:\/[0-9a-f-]{36})?$/.test(target) || target === "/memories")
      ? target
      : "/journal";
  const state = await accountState();
  return (
    <>
      <PageHeading
        eyebrow="YOUR OWN LITTLE SPACE"
        title="让故事，有自己的归属"
        description="私人记录只属于你的账号。记录与角色记忆分别管理，由你决定使用范围。"
      />
      <div className="max-w-xl">
        {state.kind === "authenticated" ? (
          <SignedInAccount
            userId={state.userId}
            email={state.email}
            returnTo={returnTo}
          />
        ) : state.kind === "anonymous" ? (
          <AccountForm returnTo={returnTo} />
        ) : (
          <AccessGate state={state} returnTo="/account" />
        )}
      </div>
    </>
  );
}
