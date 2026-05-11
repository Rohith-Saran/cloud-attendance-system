"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

const DynScanner = dynamic(() => import("react-qr-scanner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[280px] w-full max-w-xl place-items-center rounded-xl bg-slate-900 text-white">
      Loading camera…
    </div>
  ),
});

type Props = { classId?: string };

export default function QRScannerPane({}: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("Point the camera at the classroom QR.");

  const constraints = useMemo(() => ({ audio: false, video: { facingMode: "environment" } }), []);

  const handleDecodedText = useCallback(
    async (text: string) => {
      if (!text || busy) return;

      try {
        const payload = JSON.parse(text);
        if (!payload?.sessionId || !payload?.token) {
          setMsg("That QR payload is unreadable.");
          return;
        }
        setBusy(true);
        const res = await fetch("/api/attendance/mark", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: payload.sessionId, token: payload.token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Mark failed (${res.status})`);
        setMsg("Marked present ✅");
      } catch (e: any) {
        const m = typeof e?.message === "string" ? e.message : String(e);
        setMsg(m.length > 140 ? `${m.slice(0, 140)}…` : m);
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_22px_60px_-30px_rgb(30_41_59/0.65)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Scanner</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">Self-mark attendance</div>
          <div className="mt-2 text-sm text-slate-600">
            Opens the camera instantly. Screenshots expire because the projector QR rotates continuously.
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-black">
        <DynScanner
          constraints={constraints as any}
          onError={(error: unknown) => {
            setMsg(typeof error === "object" ? "Camera unavailable" : String(error));
          }}
          onScan={(data: any) => {
            if (!data?.text) return;
            void handleDecodedText(String(data.text));
          }}
        />
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
        {busy ? <span className="font-semibold text-indigo-700">Submitting…</span> : msg}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Anti-proxy enforcement: scans must originate from campus IP range and match an active projector token window.
      </div>
    </div>
  );
}
