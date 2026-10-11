import "server-only";
import { credentialsInput, confirmInput } from "@/lib/core/contracts";
import { serverClient } from "./supabase";
import { appOrigin } from "./config";
import { authenticated, body, json, route, ApiError } from "./http";
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
  if (error)
    throw new ApiError(
      error.status === 429 ? 429 : 400,
      "SIGNUP_FAILED",
      "注册尚未完成，请检查邮箱与密码或稍后重试；密码须符合服务端策略",
    );
  return json({
    authenticated: !!data.session,
    message: data.session
      ? "注册成功，已登录"
      : "请查看邮箱完成确认；如果邮箱已有账号，请直接登录",
  });
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
  const { error } = await client.auth.verifyOtp({
    token_hash: input.tokenHash,
    type: "email",
  });
  if (error)
    throw new ApiError(
      400,
      "CONFIRM_FAILED",
      "确认链接无效或已过期，请重新注册或登录",
    );
  return json({ authenticated: true });
});

export const session = route(async () => {
  const { user } = await authenticated();
  return json({ userId: user.id });
});
