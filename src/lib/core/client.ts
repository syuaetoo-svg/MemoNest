"use client";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
export class ClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
  expectedUserId?: string | null,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      cache: "no-store",
      credentials: "same-origin",
      signal,
      headers: {
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
        ...(expectedUserId ? { "X-MemoNest-User": expectedUserId } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    throw new ClientError(
      "NETWORK_ERROR",
      "网络中断，操作尚未确认。请保留当前页面并重试",
      0,
    );
  }
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new ClientError(
      result?.error?.code || "SERVICE_ERROR",
      result?.error?.message || "操作尚未确认，请重试",
      response.status,
    );
  if (!result)
    throw new ClientError(
      "SERVICE_ERROR",
      "服务返回无效，操作尚未确认，请重试",
      response.status,
    );
  return result as T;
}
export function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "操作尚未确认，请重试";
}
export const IdentityContext = createContext<string | null>(null);
export function useCoreApi() {
  const identity = useContext(IdentityContext);
  return useCallback(
    <T>(path: string, method = "GET", data?: unknown, signal?: AbortSignal) =>
      api<T>(path, method, data, identity, signal),
    [identity],
  );
}
export function useResource<T>(path: string) {
  const scopedApi = useCoreApi();
  const generation = useRef(0);
  const [state, setState] = useState<{
    path: string;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ path, data: null, error: "", loading: true });
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setState({ path, data: null, error: "", loading: true });
    try {
      const value = await scopedApi<T>(path);
      if (current === generation.current)
        setState({ path, data: value, error: "", loading: false });
    } catch (e) {
      if (current === generation.current)
        setState({ path, data: null, error: messageOf(e), loading: false });
    }
  }, [path, scopedApi]);
  useEffect(() => {
    let alive = true;
    const current = ++generation.current;
    scopedApi<T>(path)
      .then((value) => {
        if (alive && current === generation.current)
          setState({ path, data: value, error: "", loading: false });
      })
      .catch((e) => {
        if (alive && current === generation.current)
          setState({ path, data: null, error: messageOf(e), loading: false });
      });
    return () => {
      alive = false;
    };
  }, [path, scopedApi]);
  return {
    data: state.path === path ? state.data : null,
    error: state.path === path ? state.error : "",
    loading: state.path !== path || state.loading,
    refresh,
  };
}
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const before = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const navigation = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm("离开将丢失当前未保存内容，确定离开吗？")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", navigation, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", navigation, true);
    };
  }, [dirty]);
}
