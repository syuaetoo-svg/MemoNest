import { ConfirmEmail } from "@/components/core/account";
import { PageHeading } from "@/components/ui";
import { confirmationFromQuery } from "@/lib/core/auth-confirmation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "邮箱确认",
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
        title="最后一步，确认你的邮箱"
        description="这一步使用真实认证服务完成验证，不会保存生活记录或授权角色。"
      />
      <div className="max-w-xl">
        <ConfirmEmail tokenHash={confirmation && "tokenHash" in confirmation ? confirmation.tokenHash : ""} code={confirmation && "code" in confirmation ? confirmation.code : ""} />
      </div>
    </>
  );
}
