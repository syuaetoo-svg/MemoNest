import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cookieOptions, serviceConfig } from "./config";

export async function serverClient({
  readOnlyCookies = false,
}: { readOnlyCookies?: boolean } = {}) {
  const config = serviceConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions,
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (updates) => {
        // Only Server Components intentionally skip writes; proxy already refreshed them.
        // Route Handler failures must propagate, never report login success without cookies.
        if (readOnlyCookies) return;
        for (const { name, value, options } of updates)
          jar.set(name, value, options);
      },
    },
  });
}
export async function accountState() {
  const client = await serverClient({ readOnlyCookies: true });
  if (!client) return { kind: "unconfigured" as const };
  try {
    const { data, error } = await client.auth.getUser();
    if (
      error &&
      error.name !== "AuthSessionMissingError" &&
      error.status !== 401 &&
      error.status !== 403
    )
      return { kind: "unavailable" as const };
    if (!data.user) return { kind: "anonymous" as const };
    return {
      kind: "authenticated" as const,
      userId: data.user.id,
      email: data.user.email || "",
    };
  } catch {
    return { kind: "unavailable" as const };
  }
}
