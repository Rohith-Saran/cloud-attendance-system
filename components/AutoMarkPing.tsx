"use client";

import { useEffect, useRef } from "react";

type Props = {
  classId?: string;
  intervalMs?: number; // default 5 minutes
};

export default function AutoMarkPing({ classId, intervalMs = 5 * 60 * 1000 }: Props) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function stop() {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    async function sendPing() {
      try {
        await fetch("/api/attendance/auto-mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId }),
          credentials: "include",
          keepalive: true,
        });
      } catch {
        // Fail silently — off-campus pings are expected to noop.
      }
    }

    function start() {
      void sendPing();
      timerRef.current = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void sendPing();
      }, intervalMs) as unknown as number;
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") stop();
      else start();
    }

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [classId, intervalMs]);

  return null;
}
