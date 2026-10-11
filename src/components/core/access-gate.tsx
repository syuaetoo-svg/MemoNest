import Link from "next/link";
import { Card } from "@/components/ui";
import type { accountState } from "@/lib/server/supabase";
type State = Awaited<ReturnType<typeof accountState>>;
export function AccessGate({
  state,
  returnTo,
}: {
  state: Exclude<State, { kind: "authenticated" }>;
  returnTo: string;
}) {
  return (
    <Card>
      <h2 className="text-xl font-semibold">
        {state.kind === "unconfigured"
          ? "连接你的小屋之前"
          : state.kind === "unavailable"
            ? "暂时无法验证会话"
            : "先登录，让记录有自己的归属"}
      </h2>
      <p className="my-4 text-sm leading-7 text-muted">
        {state.kind === "unconfigured"
          ? "真实认证与数据库尚未配置。请按 README 设置 Supabase 并执行迁移；这里没有假登录或本地保存。"
          : state.kind === "unavailable"
            ? "认证服务暂不可用，没有读取或保存你的私人内容。请稍后重试。"
            : "生活记录属于你的账号；保存私人记录不会默认授权小栖使用。"}
      </p>
      <div className="flex flex-wrap gap-3">
        {state.kind === "anonymous" ? (
          <Link
            className="primary-link"
            href={`/account?returnTo=${encodeURIComponent(returnTo)}`}
          >
            登录或注册
          </Link>
        ) : (
          <Link className="primary-link" href={returnTo}>
            重新检查服务
          </Link>
        )}
        <Link className="primary-link" href="/">
          返回首页
        </Link>
      </div>
    </Card>
  );
}
