import "server-only";
import { serviceConfig } from "./config";

export type ConnectionCheck = { ok: boolean; checks: string[] };

// Read-only probes: no registration, private data reads, or schema changes.
// Anonymous denial is expected, but cannot establish owner isolation or schema integrity.
export async function checkSupabaseConnection(
  request: typeof fetch = fetch,
): Promise<ConnectionCheck> {
  const config = serviceConfig();
  if (!config) return { ok: false, checks: ["配置缺失或无效；检查 SUPABASE_URL、SUPABASE_PUBLISHABLE_KEY 和 APP_URL。"] };
  const checks: string[] = [];
  const get = (path: string) => request(`${config.url}${path}`, {
    headers: { apikey: config.key },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  try {
    const auth = await get("/auth/v1/settings");
    if (!auth.ok) return { ok: false, checks: [`Auth 请求失败（HTTP ${auth.status}）；检查项目状态、网络和 publishable key。`] };
    const settings = await auth.json();
    if (typeof settings?.external?.email !== "boolean" || typeof settings?.mailer_autoconfirm !== "boolean")
      return { ok: false, checks: ["Auth 返回非预期格式；未确认连接成功。"] };
    checks.push("Auth settings 可访问，项目接受 publishable key。",
      settings.external.email ? "Email provider 已启用。" : "Email provider 未启用，需要在控制台启用。",
      settings.mailer_autoconfirm ? "邮箱自动确认已启用；托管生产项目建议启用邮箱确认。" : "需要邮箱确认；SMTP 和邮件跳转仍需实际测试。");
    let ready = settings.external.email;
    for (const table of ["journal_entries", "memories", "memory_consents"]) {
      const response = await get(`/rest/v1/${table}?select=id&limit=0`);
      const body = await response.json();
      if (response.status === 401 || response.status === 403) {
        if (body?.code === "42501") {
          checks.push(`${table}：匿名读取被权限拒绝；仍需 SQL 检查迁移/RLS。`);
          continue;
        }
      }
      ready = false;
      checks.push(`${table}：未得到预期权限拒绝（HTTP ${response.status}）；在 SQL Editor 核查迁移与授权。`);
    }
    checks.push("此检查不证明登录、日记持久化、用户间隔离或 RLS 验收通过；请继续执行部署检查表。");
    return { ok: ready, checks };
  } catch {
    return { ok: false, checks: [...checks, "网络、超时或响应解析失败；检查项目域名的网络放行。未输出响应或凭据。"] };
  }
}
