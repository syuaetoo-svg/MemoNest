import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appOrigin } from "./config";
import { serverClient } from "./supabase";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function assertOrigin(request: Request) {
  let allowed: string;
  try {
    allowed = appOrigin(request.url);
  } catch {
    throw new ApiError(503, "CONFIG_REQUIRED", "服务尚未配置 APP_URL");
  }
  if (request.headers.get("origin") !== allowed)
    throw new ApiError(403, "ORIGIN_REJECTED", "请从本站页面发起操作");
}
export async function body<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "INVALID_CONTENT_TYPE", "请使用 JSON 请求");
  // Stream limit also covers chunked requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_INPUT", "请求内容为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      throw new ApiError(413, "INPUT_TOO_LARGE", "内容过长");
    }
    chunks.push(value);
  }
  let input: unknown;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "INVALID_INPUT", "请求内容格式无效");
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(
      400,
      "INVALID_INPUT",
      parsed.error.issues[0]?.message || "请检查输入",
    );
  return parsed.data;
}
export async function authenticated(request?: Request) {
  const client = await serverClient();
  if (!client)
    throw new ApiError(
      503,
      "CONFIG_REQUIRED",
      "认证与数据库尚未配置，请查看 README 的配置步骤",
    );
  const { data, error } = await client.auth.getUser();
  if (
    error &&
    error.name !== "AuthSessionMissingError" &&
    error.status !== 401 &&
    error.status !== 403
  )
    throw new ApiError(503, "AUTH_UNAVAILABLE", "暂时无法验证会话，请稍后重试");
  if (!data.user)
    throw new ApiError(401, "AUTH_REQUIRED", "请先登录；当前内容尚未保存");
  if (request) verifyOperationIdentity(request, data.user.id);
  return { client, user: data.user };
}
export function verifyOperationIdentity(request: Request, userId: string) {
  const expected = request.headers.get("x-memonest-user");
  const requiresIdentity =
    !new URL(request.url).pathname.startsWith("/api/auth/") ||
    new URL(request.url).pathname === "/api/auth/logout";
  if (
    (expected && expected !== userId) ||
    (!expected && requiresIdentity && !["GET", "HEAD"].includes(request.method))
  )
    throw new ApiError(
      409,
      "SESSION_CHANGED",
      "账号已变化或缺少操作账号，请重新登录并重新输入；没有保存当前内容",
    );
}
export function databaseError(
  error: { message: string; code?: string } | null,
) {
  if (!error) return;
  const cases: Record<string, [number, string, string]> = {
    MN_NOT_FOUND: [404, "NOT_FOUND", "内容不存在或你无权访问"],
    MN_UNAUTHORIZED: [401, "AUTH_REQUIRED", "请先登录"],
    MN_CONFLICT: [
      409,
      "VERSION_CONFLICT",
      "记录或授权已变化，请重新加载后确认；重复请求不能更换内容",
    ],
    MN_UNDO_WINDOW: [
      409,
      "UNDO_WINDOW",
      "私人保存后的 10 秒撤销窗口尚未结束，请稍后授权",
    ],
    MN_INVALID: [400, "INVALID_INPUT", "请检查内容和日期"],
  };
  const match = cases[error.message];
  if (match) throw new ApiError(...match);
  if (error.code === "23505")
    throw new ApiError(
      409,
      "VERSION_CONFLICT",
      "已有有效授权或请求正在处理，请刷新确认",
    );
  throw new ApiError(
    503,
    "DATABASE_UNAVAILABLE",
    "数据库操作尚未确认，请重试；管理员请检查迁移与服务配置",
  );
}
export function route<
  P extends Record<string, string> = Record<string, string>,
>(
  handler: (
    request: Request,
    context: { params: Promise<P> },
  ) => Promise<Response>,
) {
  return async (request: Request, context: { params: Promise<P> }) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) assertOrigin(request);
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError)
        return json(
          { error: { code: error.code, message: error.message } },
          error.status,
        );
      return json(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "操作尚未确认，服务暂不可用，请重试",
          },
        },
        503,
      );
    }
  };
}
