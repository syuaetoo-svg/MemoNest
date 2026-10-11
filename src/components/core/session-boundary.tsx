"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { api, ClientError, IdentityContext } from "@/lib/core/client";
import { Card } from "@/components/ui";
export function SessionBoundary({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let alive = true;
    async function verify() {
      if (document.visibilityState === "hidden") return;
      try {
        const result = await api<{ userId: string }>("/api/auth/session");
        if (alive && result.userId !== userId) setExpired(true);
      } catch (error) {
        if (alive && error instanceof ClientError && error.status === 401)
          setExpired(true);
      }
    }
    const visible = () => {
      void verify();
    };
    window.addEventListener("focus", visible);
    window.addEventListener("pageshow", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive = false;
      window.removeEventListener("focus", visible);
      window.removeEventListener("pageshow", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [userId]);
  if (expired)
    return (
      <Card>
        <h2 className="text-xl font-semibold">会话已变化</h2>
        <p role="alert" className="my-4 text-sm leading-7">
          已清除当前页面的私人内容与临时输入，避免被保存到其他账号。请重新登录。
        </p>
        <Link className="primary-link" href="/account">
          重新登录
        </Link>
      </Card>
    );
  return <IdentityContext value={userId}>{children}</IdentityContext>;
}
