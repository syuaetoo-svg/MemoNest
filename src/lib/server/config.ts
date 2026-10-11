import "server-only";

export function serviceConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return null;
    if (process.env.APP_URL) {
      const app = new URL(process.env.APP_URL);
      const local = ["localhost", "127.0.0.1"].includes(app.hostname);
      if (
        (app.protocol !== "https:" && !(app.protocol === "http:" && local)) ||
        app.username ||
        app.password ||
        app.pathname !== "/" ||
        app.search ||
        app.hash
      )
        return null;
    }
    if (
      parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname)
      )
    )
      return null;
    // Accept publishable keys or legacy anon keys only; never a service-role key.
    if (!key.startsWith("sb_publishable_")) {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1] || "", "base64url").toString(),
      );
      if (payload.role !== "anon") return null;
    }
    if (process.env.NODE_ENV === "production" && !process.env.APP_URL)
      return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
export function appOrigin(requestUrl: string) {
  const configured = process.env.APP_URL;
  if (!configured && process.env.NODE_ENV === "production")
    throw new Error("APP_URL missing");
  return new URL(configured || requestUrl).origin;
}
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
