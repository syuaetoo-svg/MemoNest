"use client";
import { LogIn, UserPlus, PenLine, LogOut, Check, ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, messageOf } from "@/lib/core/client";
import { credentialsInput } from "@/lib/core/contracts";
import { Button, Feedback, fieldClass } from "./ui";
import { Card } from "@/components/ui";
import { confirmationPending } from "@/lib/core/interface-copy";
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
      else setNotice(confirmationPending);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="account-surface">
      <div className="mb-6 flex gap-3">
        <Button
          tone={mode === "login" ? "primary" : "secondary"}
          onClick={() => {
            setMode("login");
            setError("");
            setNotice("");
          }}
          disabled={busy}
        ><LogIn size={16} aria-hidden="true" className="control-icon"/>
          Sign in
        </Button>
        <Button
          tone={mode === "signup" ? "primary" : "secondary"}
          onClick={() => {
            setMode("signup");
            setError("");
            setNotice("");
          }}
          disabled={busy}
        ><UserPlus size={16} aria-hidden="true" className="control-icon"/>
          Create account
        </Button>
      </div>
      <h2 className="mb-5 text-xl font-semibold">
        {mode === "login" ? "Welcome back" : "Create your space"}
      </h2>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="account-email" className="mb-2 block text-sm">
            Email
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
            Password (at least 8 characters)
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
        <Button type="submit" disabled={busy}><UserPlus size={16} aria-hidden="true" className="control-icon"/>
          {busy ? (mode === "login" ? "Signing in…" : "Creating account…") : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-sm leading-7 text-muted">
        We use Supabase Auth
        to verify your identity. You may need to confirm your email. Creating an account does not grant AI access to your entries.
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
      <h2 className="text-xl font-semibold">You’re signed in</h2>
      <p className="my-4 break-all text-sm text-muted">{email}</p>
      <Feedback message={error} error />
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="primary-link" href={returnTo}><PenLine size={16} aria-hidden="true" className="control-icon"/>
          Continue writing
        </Link>
        <Button tone="secondary" disabled={busy} onClick={logout}><LogOut size={16} aria-hidden="true" className="control-icon"/>
          {busy ? "Signing out…" : "Sign out everywhere"}
        </Button>
      </div>
      <p className="mt-4 text-sm leading-7 text-muted">
        Signing out clears this browser’s session and revokes the account’s refresh sessions. On a shared device, check that sign-out completes.
      </p>
    </Card>
  );
}
export function ConfirmEmail({ tokenHash, code = "" }: { tokenHash: string; code?: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/confirm", "POST", tokenHash ? { tokenHash } : { code });
      window.location.replace(new URL("/journal", window.location.origin).href);
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2 className="text-xl font-semibold">Confirm your email</h2>
      <p className="my-4 text-sm leading-7 text-muted">
        Sign-in starts only after you confirm. The link can be used once.
      </p>
      <Feedback message={error} error />
      <Button disabled={busy || (!tokenHash && !code)} onClick={confirm}><Check size={16} aria-hidden="true" className="control-icon"/>
        {busy ? "Confirming…" : "Confirm email"}
      </Button>
      <Link className="ml-4 text-sm underline" href="/account"><ArrowLeft size={16} aria-hidden="true" className="control-icon"/>
        Back to sign in
      </Link>
      {!tokenHash && !code && (
        <Feedback message="This link is incomplete. Open the confirmation link from your sign-up email." error />
      )}
    </Card>
  );
}
