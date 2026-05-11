"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentHomePage() {
  const [note, setNote] = useState<{ unread: number; alerts: string[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && data) setNote({ unread: data.unread ?? 0, alerts: data.alerts ?? [] });
      } catch {
        if (!cancelled) setNote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const alertCopy = note?.alerts?.[0] ?? "Attendance monitoring is enabled.";

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Student</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Welcome back</div>
          <div className="mt-3 text-sm leading-relaxed text-slate-600">
            Your phone quietly pings <span className="font-semibold text-slate-900">/api/attendance/auto-mark</span> every five
            minutes while you&apos;re on campus Wi-Fi. Off-campus requests are ignored without nagging you.
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/student/attendance"
              className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Open attendance insights
            </Link>
            <Link
              href="/dashboard/student/attendance#leave"
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Apply for leave
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-indigo-600 to-indigo-950 p-6 text-white shadow-xl shadow-indigo-900/25">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-indigo-50/85">In-app notifications</div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tabular-nums ring-1 ring-white/20">
              {note?.unread ?? 0} unread
            </div>
          </div>
          <div className="mt-4 text-sm leading-relaxed text-indigo-50/90">{alertCopy}</div>
          <div className="mt-4 text-xs text-indigo-50/70">
            Lambda + SES/SNS can append push/email/sms history into Dynamo when EventBridge fires nightly.
          </div>
        </div>
      </div>
    </div>
  );
}
