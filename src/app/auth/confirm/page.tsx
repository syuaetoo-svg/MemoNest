import { ConfirmEmail } from "@/components/core/account";
import { PageHeading } from "@/components/ui";
import { confirmationFromQuery } from "@/lib/core/auth-confirmation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Confirm email",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const confirmation = confirmationFromQuery(query);
  return (
    <>
      <PageHeading
        eyebrow="WELCOME HOME"
        title="One last step: confirm your email"
        description="Confirm your email to sign in. This does not save entries or grant memory access."
      />
      <div className="max-w-xl">
        <ConfirmEmail tokenHash={confirmation && "tokenHash" in confirmation ? confirmation.tokenHash : ""} code={confirmation && "code" in confirmation ? confirmation.code : ""} />
      </div>
    </>
  );
}
