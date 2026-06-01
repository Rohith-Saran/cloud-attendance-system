"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Summary = {
  totalStudents: number;
  markedToday: number;
  pending: number;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TeacherHomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const classes = useMemo(() => {
    // UI-only today list; production can be wired to schedule table.
    return [
      { label: "Period 1", time: "08:00" },
      { label: "Period 2", time: "09:00" },
      { label: "Period 3", time: "10:00" },
    ];
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/teacher/summary", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load summary");
        if (!cancelled) setSummary(data);
      } catch (err) {
        console.error(err);
        const demo: Summary = {
          totalStudents: 1,
          markedToday: 0,
          pending: 1,
        };
        if (!cancelled) setSummary(demo);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = summary;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Teacher</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Welcome back</div>
          <div className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">Today: {todayISO()} — manage classes fast with one unified console.</div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/teacher/mark?classId=class-a&subject=Distributed%20Systems"
            className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700"
          >
            Mark Attendance
          </Link>
          <Link
            href="/dashboard/teacher/reports"
            className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            View Reports
          </Link>
          <Link
            href="/dashboard/teacher/leaves"
            className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Leaves
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Today&apos;s classes</div>
              <div className="mt-1 text-sm text-slate-600">Quick jump into each session</div>
            </div>
            <div className="text-xs rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 font-semibold">3 sessions</div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {classes.map((c) => (
              <Link
                key={c.label}
                href="/dashboard/teacher/mark?classId=class-a&subject=Distributed%20Systems"
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-white transition"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</div>
                <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{c.time}</div>
                <div className="mt-1 text-xs text-slate-600">Open roster</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
          <div className="text-sm font-semibold text-indigo-900">Quick stats</div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-white border border-indigo-100 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Total students</div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{loading ? "…" : kpis?.totalStudents ?? 0}</div>
            </div>
            <div className="rounded-2xl bg-white border border-indigo-100 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Marked today</div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{loading ? "…" : kpis?.markedToday ?? 0}</div>
            </div>
            <div className="rounded-2xl bg-white border border-indigo-100 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Pending</div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{loading ? "…" : kpis?.pending ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Next action</div>
          <div className="mt-2 text-sm text-slate-600">Mark attendance in under 30 seconds.</div>
          <div className="mt-4">
            <Link
              href="/dashboard/teacher/mark?classId=class-a&subject=Distributed%20Systems"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Open roster
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Leave inbox</div>
          <div className="mt-2 text-sm text-slate-600">Approve or reject pending requests.</div>
          <div className="mt-4">
            <Link
              href="/dashboard/teacher/leaves"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Review leaves
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Export</div>
          <div className="mt-2 text-sm text-slate-600">Generate PDF/CSV reports.</div>
          <div className="mt-4">
            <Link
              href="/dashboard/teacher/reports"
              onClick={(e) => {
                // Prevent “button feels dead” when the app is in the middle of auth hydration.
                // Navigation still happens normally.
                e.stopPropagation();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              View reports
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

