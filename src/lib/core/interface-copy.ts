/** Interface feedback only. Never apply to entries, messages, summaries or AI output. */
const errors: Record<string, string> = {
  NETWORK_ERROR: "Connection lost. Keep this page open and try again; the action is not confirmed.",
  AUTH_REQUIRED: "Please sign in to continue.",
  AUTH_UNAVAILABLE: "Sign-in is temporarily unavailable. Please try again.",
  CONFIG_REQUIRED: "This service is not connected yet. Please contact the project owner.",
  DATABASE_UNAVAILABLE: "Your journal is temporarily unavailable. Keep your draft and try again.",
  SERVICE_UNAVAILABLE: "The service is temporarily unavailable. Please try again.",
  SESSION_CHANGED: "Your session has changed. Please sign in again.",
  INVALID_INPUT: "Check the form and try again.",
  INPUT_TOO_LARGE: "This request is too large. Please shorten it and try again.",
  INVALID_CONTENT_TYPE: "The request could not be read. Please try again.",
  ORIGIN_REJECTED: "This request was blocked. Refresh this page and try again.",
  NOT_FOUND: "This item is unavailable or you do not have access.",
  VERSION_CONFLICT: "This entry has changed. Reload the latest version before continuing.",
  UNDO_WINDOW: "Wait for the undo window to end before sharing a memory.",
  LOGIN_FAILED: "Couldn’t sign in. Check your details and email confirmation, then try again.",
  LOGOUT_FAILED: "Sign-out is not confirmed. Please try again before leaving this device.",
  CONFIRM_FAILED: "Confirmation failed. The link may be expired or missing its sign-up session. Use the browser you signed up in, or contact the project owner.",
  SIGNUP_EMAIL_RESTRICTED: "Email delivery to this address is restricted. Ask the project owner to check the email service.",
  SIGNUP_EMAIL_RATE_LIMIT: "The email sending limit has been reached. Try later; do not register repeatedly.",
  SIGNUP_RATE_LIMIT: "Too many sign-up requests. Try later. Email delivery is not confirmed.",
  SIGNUP_DISABLED: "Email sign-up is not enabled. Please contact the project owner.",
  SIGNUP_SERVICE_UNAVAILABLE: "Sign-up is unavailable. Email delivery is not confirmed. Ask the project owner to check the auth and email logs.",
  SIGNUP_FAILED: "Sign-up is not complete. Check your details or contact the project owner. Email delivery is not confirmed.",
  AI_NOT_CONFIGURED: "AI is not connected yet. You can still write and save entries yourself.",
  AI_AUTH_FAILED: "AI could not connect. Ask the project owner to check the provider connection.",
  AI_RATE_LIMIT: "AI is busy. Please wait a moment and try again.",
  AI_UNAVAILABLE: "AI is temporarily unavailable. Please try again.",
  AI_BAD_REQUEST: "AI could not process this request. Check your selection and try again.",
  AI_INTERRUPTED: "The request stopped or its source changed. Check your selection before trying again.",
  AI_SOURCE_CHANGED: "A source changed. Reload it and confirm your selection again.",
  AI_INPUT_TOO_LARGE: "Too much text for this request. Choose fewer or shorter entries.",
  REVIEW_TOO_LONG: "This entry exceeds the 6,000-character reflection limit. Your original entry is unchanged.",
  AI_INVALID_OUTPUT: "AI returned an unusable response. Nothing was saved. Please try again.",
  AI_EVIDENCE_INVALID: "The response could not be checked against its sources. Nothing was saved. Please try again.",
  AI_GENERATION_FAILED: "AI could not finish this request. Nothing was saved. Please try again.",
};
const validation: Record<string, string> = {
  "请选择有效日期": "Choose a valid date.",
  "日期须在 1900–2100 年内且真实存在": "Choose a valid date between 1900 and 2100.",
  "请写下正文": "Write a little moment before saving.",
  "密码至少 8 位": "Use a password with at least 8 characters.",
};
export function interfaceFeedback(message: string, code?: string) {
  if (code && errors[code]) return errors[code];
  return validation[message] ?? message;
}
export const confirmationPending = "You are not signed in yet. Check your email for confirmation; delivery is not confirmed. If you already have an account, sign in instead. If no email arrives, ask the project owner to check the email service.";
