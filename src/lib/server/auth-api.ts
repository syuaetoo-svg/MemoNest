import "server-only";
import { credentialsInput, confirmInput } from "@/lib/core/contracts";
import { serverClient } from "./supabase";
import { appOrigin } from "./config";
import { authenticated, body, json, route, ApiError } from "./http";
import { registrationOutcome, signupFailure, confirmSession } from "./auth-outcomes";
async function authClient() {
  const client = await serverClient();
  if (!client)
    throw new ApiError(
      503,
      "CONFIG_REQUIRED",
      "认证服务尚未配置，请查看 README",
    );
  return client;
}
export const signup = route(async (request) => {
  const client = await authClient();
  const input = await body(request, credentialsInput);
  const { data, error } = await client.auth.signUp({
    ...input,
    options: { emailRedirectTo: `${appOrigin(request.url)}/auth/confirm` },
  });
  if (error) {
    const failure = signupFailure(error);
    // Only application-owned categories; never email, password, raw response or token.
    console.warn("[auth] signup rejected", { status: failure.status, code: failure.code });
    throw failure;
  }
  return json(registrationOutcome(!!data.session));
});
export const login = route(async (request) => {
  const client = await authClient();
  const input = await body(request, credentialsInput);
  const { error } = await client.auth.signInWithPassword(input);
  if (error)
    throw new ApiError(
      error.status === 429 ? 429 : 401,
      "LOGIN_FAILED",
      "登录失败，请检查邮箱、密码及邮箱确认状态，或稍后重试",
    );
  return json({ authenticated: true });
});
export const logout = route(async (request) => {
  const { client } = await authenticated(request);
  const { error } = await client.auth.signOut({ scope: "global" });
  if (error) throw new ApiError(503, "LOGOUT_FAILED", "退出尚未确认，请重试");
  return json({ signedOut: true });
});
export const confirm = route(async (request) => {
  const client = await authClient();
  const input = await body(request, confirmInput);
  return json(await confirmSession(client.auth, input));
});

export const session = route(async () => {
  const { user } = await authenticated();
  return json({ userId: user.id });
});
