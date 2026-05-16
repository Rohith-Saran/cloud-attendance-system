"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

const TICK_MS = 1000;

type Props = { classId: string; subject?: string };

export default function QRGenerator({ classId, subject = "" }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [img, setImg] = useState<string>("");
  const [expiresIn, setExpiresIn] = useState<number>(30);
  const [err, setErr] = useState<string | null>(null);

  const payload = useMemo(() => ({ sessionId, token }), [sessionId, token]);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/attendance/qr", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, subject }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not create session");
        if (aborted) return;
        setSessionId(data.sessionId);
      } catch (e: any) {
        if (!aborted) setErr(e.message || String(e));
      }
    })();
    return () => {
      aborted = true;
    };
  }, [classId, subject]);

  useEffect(() => {
    if (!sessionId) return;
    const sid = sessionId;

    let timer: ReturnType<typeof setInterval> | null = null;

    async function refresh() {
      try {
        const res = await fetch(`/api/attendance/qr?sessionId=${encodeURIComponent(sid)}`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setToken(data.token);
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now % 30;
        setExpiresIn(30 - elapsed);
      } catch {
        // ignore noisy refresh errors
      }
    }

    refresh();
    timer = setInterval(refresh, TICK_MS);
    return () => clearInterval(timer);
  }, [sessionId]);

  useEffect(() => {
    if (!payload.sessionId || !payload.token) return;
    (async () => {
      try {
        const url = await QRCode.toDataURL(JSON.stringify(payload), {
          width: 256,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setImg(url);
      } catch {
        setImg("");
      }
    })();
  }, [payload.sessionId, payload.token]);

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_22px_60px_-30px_rgb(30_41_59/0.65)] ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Layer 3 · Rotating QR
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-900">Projector session code</div>
          <div className="mt-2 text-sm text-slate-600">
            Tokens rotate every <span className="font-semibold">30 seconds</span> and require campus WiFi at scan time.
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[auto,1fr] sm:items-center">
        <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-3">
          {img ? (
            <img src={img} alt="Attendance QR code" width={260} height={260} />
          ) : (
            <div className="grid h-[256px] w-[256px] place-items-center text-sm text-slate-400">
              {err ? err : sessionId ? "Preparing QR…" : "Starting session…"}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session ID</div>
            <div className="mt-1 break-all font-mono text-xs text-slate-800">{sessionId ?? "…"}</div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="relative h-14 w-14 shrink-0">
              <svg className="-rotate-90" viewBox="0 0 36 36" height="56" width="56" aria-hidden>
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#c7d2fe"
                  strokeWidth="6"
                  pathLength={100}
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="6"
                  strokeDasharray={`${Math.max(0, Math.min(100, ((30 - expiresIn) / 30) * 100))} 100`}
                  pathLength={100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums text-indigo-700">
                {expiresIn}s
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-indigo-900">QR refreshes soon</div>
              <div className="mt-1 text-sm text-indigo-800/80">
                Countdown aligns to the rotating HMAC window so screenshots quickly expire.
              </div>
            </div>
          </div>
        </div>
      </div>

      {!sessionId ? null : (
        <div className="mt-4 text-xs leading-relaxed text-slate-500">
          Payload encodes signed {"{ sessionId, token }"} for `/api/attendance/mark` validation (QR + WiFi anti-proxy checks).
        </div>
      )}
    </div>
  );
}
