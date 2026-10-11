import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, serviceConfig } from "@/lib/server/config";

export async function proxy(request: NextRequest) {
  const config = serviceConfig();
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (!config) return response;
  const client = createServerClient(config.url, config.key, {
    cookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (updates) => {
        for (const { name, value } of updates) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        response.headers.set("Cache-Control", "private, no-store");
        for (const { name, value, options } of updates)
          response.cookies.set(name, value, options);
      },
    },
  });
  try {
    await client.auth.getUser();
  } catch {
    /* Pages show service errors; never fabricate a session. */
  }
  return response;
}
export const config = { matcher: ["/account", "/journal/:path*", "/memories"] };
