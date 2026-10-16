import Link from "next/link";
import { Card } from "@/components/ui";
import type { accountState } from "@/lib/server/supabase";
import { LogIn, RefreshCw, House } from "lucide-react";
type State = Awaited<ReturnType<typeof accountState>>;
export function AccessGate({
  state,
  returnTo,
}: {
  state: Exclude<State, { kind: "authenticated" }>;
  returnTo: string;
}) {
  return (
    <Card>
      <h2 className="text-xl font-semibold">
        {state.kind === "unconfigured"
          ? "Service not connected"
          : state.kind === "unavailable"
            ? "We couldn’t check your session"
            : "Sign in to your space"}
      </h2>
      <p className="my-4 text-sm leading-7 text-muted">
        {state.kind === "unconfigured"
          ? "Authentication and storage are not configured. The project owner needs to connect Supabase. No entries are saved locally."
          : state.kind === "unavailable"
            ? "Sign-in is temporarily unavailable. No private content has been read or saved. Please try again."
            : "Your entries belong to your account. Saving does not give Xiaoqi access."}
      </p>
      <div className="flex flex-wrap gap-3">
        {state.kind === "anonymous" ? (
          <Link
            className="primary-link"
            href={`/account?returnTo=${encodeURIComponent(returnTo)}`}
          >
            <LogIn size={16} aria-hidden="true"/>Sign in or create account
          </Link>
        ) : (
          <Link className="primary-link" href={returnTo}>
            <RefreshCw size={16} aria-hidden="true"/>Check again
          </Link>
        )}
        <Link className="primary-link" href="/">
          <House size={16} aria-hidden="true"/>Back to Overview
        </Link>
      </div>
    </Card>
  );
}
