"use client";
import { useEffect, useState } from "react";
export function useRemaining(until: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!until) return;
    const update = () =>
      setRemaining(
        Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 1000)),
      );
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [until]);
  return until ? remaining : 0;
}
