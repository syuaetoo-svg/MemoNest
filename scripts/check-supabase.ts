import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { checkSupabaseConnection } from "../src/lib/server/connection-check";

// Explicit injected variables take precedence; never print local configuration.
async function main() {
  if (existsSync(".env.local")) loadEnvFile(".env.local");
  const result = await checkSupabaseConnection();
  for (const check of result.checks) console.log(check);
  process.exitCode = result.ok ? 0 : 1;
}
void main().catch(() => {
  console.error("本地配置无法读取；请检查 .env.local，不要输出凭据。");
  process.exitCode = 1;
});
