import { ConfirmEmail } from "@/components/core/account";
import { PageHeading } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "邮箱确认",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const query = await searchParams;
  const token =
    query.type === "email" && query.token_hash && query.token_hash.length <= 512
      ? query.token_hash
      : "";
  return (
    <>
      <PageHeading
        eyebrow="WELCOME HOME"
        title="最后一步，确认你的邮箱"
        description="这一步使用真实认证服务完成验证，不会保存生活记录或授权角色。"
      />
      <div className="max-w-xl">
        <ConfirmEmail tokenHash={token} />
      </div>
    </>
  );
}
