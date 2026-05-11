"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Summary = {
  totalStudents: number;
  todayAttendancePct: number;
  lowAttendanceCount: number;
  lowThreshold: number;
};

export default function AdminHomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/summary", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && data) setSummary(data);
      } catch {
        if (!cancelled) setSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = useMemo(() => summary, [summary]);

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Admin</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Operational overview</div>
        <div className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Monitor enrollment health, today&apos;s presence snapshot, and downstream alerts. DynamoDB + SES/SNS automations
          plug in behind these tiles once tables are live.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/40 bg-gradient-to-br from-emerald-600 to-emerald-900 p-6 text-white shadow-xl shadow-emerald-900/25">
          <div className="text-sm text-emerald-50/80">Students enrolled</div>
          <div className="mt-4 text-5xl font-semibold tabular-nums">
            {kpis?.totalStudents ?? "…"}
          </div>
          <div className="mt-3 text-xs text-emerald-50/85">Sourced from Users scans / demo fixtures when offline.</div>
        </div>

        <div className="rounded-3xl border border-white/40 bg-gradient-to-br from-indigo-600 to-indigo-950 p-6 text-white shadow-xl shadow-indigo-900/25">
          <div className="text-sm text-indigo-50/80">Today&apos;s attendance</div>
          <div className="mt-4 text-5xl font-semibold tabular-nums">{kpis?.todayAttendancePct ?? "…"}%</div>
          <div className="mt-3 text-xs text-indigo-50/85">Compares present marks against active student profiles.</div>
        </div>

        <div className="rounded-3xl border border-white/40 bg-gradient-to-br from-amber-500 via-amber-600 to-rose-900 p-6 text-white shadow-xl shadow-amber-900/20">
          <div className="text-sm text-amber-50/85">Low-attendance flags</div>
          <div className="mt-4 text-5xl font-semibold tabular-nums">{kpis?.lowAttendanceCount ?? "…"}</div>
          <div className="mt-3 text-xs text-amber-50/85">
            Threshold&nbsp;
            <span className="font-semibold">{kpis?.lowThreshold ?? 75}%</span> — EventBridge/Lambda can hydrate this.
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/admin/students"
          className="group rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Roster tools</div>
          <div className="mt-2 text-lg font-semibold text-slate-950 group-hover:text-indigo-800">Students · CSV import</div>
          <div className="mt-2 text-sm text-slate-600">
            Create, edit, and bulk preview rosters; partition keys use <code className="font-mono text-xs text-slate-800">userId</code>
            &nbsp;once Dynamo is wired end-to-end.
          </div>
          <div className="mt-4 text-sm font-semibold text-indigo-700">Go to students →</div>
        </Link>

        <Link
          href="/dashboard/admin/reports"
          className="group rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Insights</div>
          <div className="mt-2 text-lg font-semibold text-slate-950 group-hover:text-indigo-800">Reports · PDF + CSV</div>
          <div className="mt-2 text-sm text-slate-600">
            Server-rendered exports land in private S3; the UI opens a minted URL that expires quickly.
          </div>
          <div className="mt-4 text-sm font-semibold text-indigo-700">Open reporting →</div>
        </Link>
      </div>
    </div>
  );
}
