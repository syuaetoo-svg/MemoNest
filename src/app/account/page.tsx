import { PageHeading } from "@/components/ui";
import { AccountForm, SignedInAccount } from "@/components/core/account";
import { AccessGate } from "@/components/core/access-gate";
import { accountState } from "@/lib/server/supabase";
import { GlassCompanion } from "@/components/glass-companion";
export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };
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
        title="Your own little space"
        description="Your entries belong to your account. You choose what stays private and what Xiaoqi may use."
      />
      <div className="account-workspace">
        <aside className="account-welcome"><GlassCompanion state="welcome"/><h2>A place for your moments</h2><p>Your stories stay yours.<br/>You choose what Xiaoqi remembers.</p></aside>
        <div>
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
      </div>
    </>
  );
}
