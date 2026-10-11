"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, messageOf } from "@/lib/core/client";
import { credentialsInput } from "@/lib/core/contracts";
import { Button, Feedback, fieldClass } from "./ui";
import { Card } from "@/components/ui";
// Full navigation after identity changes drops private client state and the router cache.
export function AccountForm({ returnTo }: { returnTo: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    const parsed = credentialsInput.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ authenticated: boolean; message?: string }>(
        `/api/auth/${mode}`,
        "POST",
        parsed.data,
      );
      setPassword("");
      if (result.authenticated)
        window.location.assign(new URL(returnTo, window.location.origin).href);
      else setNotice(result.message || "请检查邮箱完成确认");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <div className="mb-6 flex gap-3">
        <Button
          tone={mode === "login" ? "primary" : "secondary"}
          onClick={() => {
            setMode("login");
            setError("");
            setNotice("");
          }}
          disabled={busy}
        >
          登录
        </Button>
        <Button
          tone={mode === "signup" ? "primary" : "secondary"}
          onClick={() => {
            setMode("signup");
            setError("");
            setNotice("");
          }}
          disabled={busy}
        >
          注册
        </Button>
      </div>
      <h2 className="mb-5 text-xl font-semibold">
        {mode === "login" ? "回到你的小屋" : "建立自己的记忆小屋"}
      </h2>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="account-email" className="mb-2 block text-sm">
            邮箱
          </label>
          <input
            id="account-email"
            className={fieldClass}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
            disabled={busy}
          />
        </div>
        <div>
          <label htmlFor="account-password" className="mb-2 block text-sm">
            密码（至少 8 位）
          </label>
          <input
            id="account-password"
            className={fieldClass}
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={128}
            disabled={busy}
          />
        </div>
        <Feedback message={error} error />
        <Feedback message={notice} />
        <Button type="submit" disabled={busy}>
          {busy ? "正在验证…" : mode === "login" ? "登录小屋" : "注册账号"}
        </Button>
      </form>
      <p className="mt-5 text-sm leading-7 text-muted">
        使用 Supabase Auth
        验证身份。注册可能需要邮箱确认；不创建示例账号、不自动授权 AI 使用记录。
      </p>
    </Card>
  );
}
export function SignedInAccount({
  userId,
  email,
  returnTo,
}: {
  email: string;
  userId: string;
  returnTo: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/logout", "POST", {}, userId);
      window.location.assign(new URL("/account", window.location.origin).href);
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2 className="text-xl font-semibold">已登录</h2>
      <p className="my-4 break-all text-sm text-muted">{email}</p>
      <Feedback message={error} error />
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="primary-link" href={returnTo}>
          继续记录
        </Link>
        <Button tone="secondary" disabled={busy} onClick={logout}>
          {busy ? "正在退出…" : "退出所有会话"}
        </Button>
      </div>
      <p className="mt-4 text-sm leading-7 text-muted">
        退出会清除本浏览器会话并撤销账号的刷新会话。离开共享设备前请确认退出成功。
      </p>
    </Card>
  );
}
export function ConfirmEmail({ tokenHash }: { tokenHash: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/confirm", "POST", { tokenHash });
      window.location.replace(new URL("/journal", window.location.origin).href);
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2 className="text-xl font-semibold">确认邮箱，进入小屋</h2>
      <p className="my-4 text-sm leading-7 text-muted">
        只有你主动确认后才建立登录会话。确认链接只能使用一次。
      </p>
      <Feedback message={error} error />
      <Button disabled={busy || !tokenHash} onClick={confirm}>
        {busy ? "正在确认…" : "确认邮箱"}
      </Button>
      <Link className="ml-4 text-sm underline" href="/account">
        返回登录
      </Link>
      {!tokenHash && (
        <Feedback message="链接缺少有效确认信息，请从注册邮件重新进入" error />
      )}
    </Card>
  );
}
