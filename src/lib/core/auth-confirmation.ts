import { confirmInput } from "./contracts";

/** Never accept recovery links, ambiguous methods, provider errors or open redirect targets. */
export function confirmationFromQuery(query: Record<string, string | string[] | undefined>) {
  if (query.error || query.error_code || (query.type && query.type !== "email")) return null;
  if (query.token_hash && query.code) return null;
  const input = query.type === "email" && typeof query.token_hash === "string"
    ? { tokenHash: query.token_hash }
    : typeof query.code === "string" ? { code: query.code } : null;
  const result = confirmInput.safeParse(input);
  return result.success ? result.data : null;
}
