"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * v1 "live" = polling. Re-fetches the server component on an interval, and once when the
 * tab becomes visible again. No websockets in v1.
 */
export function Poller({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);
  return null;
}
