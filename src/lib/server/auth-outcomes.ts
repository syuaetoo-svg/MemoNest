import { ApiError } from "./http";

export function registrationOutcome(authenticated: boolean) {
  return {
    authenticated,
    registrationStatus: authenticated ? "authenticated" : "confirmation_required_or_existing",
    emailDelivery: "unverified" as const,
    message: authenticated ? "已建立登录会话" : "尚未登录。请检查邮箱确认邮件；邮件是否送达尚未确认。若已有账号，请使用原账号登录。未收到邮件请联系管理员检查邮件服务。",
  };
}

export function signupFailure(error: { status?: number; code?: string }) {
  if (error.code === "email_address_not_authorized") return new ApiError(400, "SIGNUP_EMAIL_RESTRICTED", "当前邮件服务不允许向该邮箱发送确认邮件，请联系管理员检查邮件发送设置。");
  if (error.code === "over_email_send_rate_limit") return new ApiError(429, "SIGNUP_EMAIL_RATE_LIMIT", "确认邮件发送已达到限制，请稍后再试；不要反复注册。管理员可检查邮件发送限额。");
  if (error.code === "email_provider_disabled" || error.code === "signup_disabled") return new ApiError(503, "SIGNUP_DISABLED", "当前服务未开放邮箱注册，请联系管理员检查认证设置。");
  if (error.status === 429) return new ApiError(429, "SIGNUP_RATE_LIMIT", "注册请求过于频繁，请稍后重试；尚未确认邮件是否发送。");
  if (error.status && error.status >= 500) return new ApiError(503, "SIGNUP_SERVICE_UNAVAILABLE", "注册服务暂不可用，尚未确认邮件发送。请联系管理员检查 Auth 日志及邮件服务。");
  return new ApiError(400, "SIGNUP_FAILED", "注册请求未完成，请检查输入或联系管理员；尚未确认邮件发送。");
}

type AuthResult = { data: { session: unknown }; error: unknown };
type ConfirmationAuth = {
  verifyOtp: (input: { token_hash: string; type: "email" }) => Promise<AuthResult>;
  exchangeCodeForSession: (code: string) => Promise<AuthResult>;
};
export async function confirmSession(auth: ConfirmationAuth, input: { tokenHash: string } | { code: string }) {
  const result = "tokenHash" in input
    ? await auth.verifyOtp({ token_hash: input.tokenHash, type: "email" })
    : await auth.exchangeCodeForSession(input.code);
  if (result.error || !result.data.session) throw new ApiError(400, "CONFIRM_FAILED", "确认未完成：链接可能无效、已过期或缺少注册会话。请使用注册时的浏览器确认，或联系管理员检查邮件模板。");
  return { authenticated: true };
}
