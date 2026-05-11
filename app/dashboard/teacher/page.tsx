"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";

const AttendanceBarChart = dynamic(() => import("~/components/charts/AttendanceBarChart"), { ssr: false });
const MonthlyTrendLine = dynamic(() => import("~/components/charts/MonthlyTrendLine"), { ssr: false });

export default function TeacherHomePage() {
  const barData = useMemo(
    () => [
      { name: "Mon", present: 54, absent: 6 },
      { name: "Tue", present: 52, absent: 8 },
      { name: "Wed", present: 56, absent: 4 },
      { name: "Thu", present: 50, absent: 10 },
      { name: "Fri", present: 48, absent: 12 },
    ],
    [],
  );

  const lineData = useMemo(
    () => [
      { month: "Jan", rate: 86 },
      { month: "Feb", rate: 88 },
      { month: "Mar", rate: 84 },
      { month: "Apr", rate: 91 },
      { month: "May", rate: 93 },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Teacher</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Instructional cockpit</div>
          <div className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Visualize class momentum, jump into the combined Layer 1–3 builder, and triage leave slips with one scroll.
          </div>
        </div>
        <Link
          href="/dashboard/teacher/mark?classId=class-a&subject=Distributed%20Systems"
          className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700"
        >
          Open roster + QR
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/teacher/leaves"
          className="group rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Workflow</div>
          <div className="mt-2 text-lg font-semibold text-slate-950 group-hover:text-indigo-800">Leave requests inbox</div>
          <div className="mt-2 text-sm text-slate-600">Approve or reject student absence windows without leaving the suite.</div>
          <div className="mt-4 text-sm font-semibold text-indigo-700">Open leaves →</div>
        </Link>
        <Link
          href="/dashboard/teacher/mark?classId=class-a&subject=Distributed%20Systems"
          className="group rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Session</div>
          <div className="mt-2 text-lg font-semibold text-slate-950 group-hover:text-indigo-800">Mark attendance + QR</div>
          <div className="mt-2 text-sm text-slate-600">Bulk roster, Wi‑Fi cues, and rotating projector codes in one surface.</div>
          <div className="mt-4 text-sm font-semibold text-indigo-700">Launch console →</div>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Class pulse (week)</div>
          <div className="mt-1 text-sm text-slate-600">Presence vs absence by weekday</div>
          <div className="mt-6">
            <AttendanceBarChart data={barData} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Term trend</div>
          <div className="mt-1 text-sm text-slate-600">Rolling attendance rate</div>
          <div className="mt-6">
            <MonthlyTrendLine data={lineData} />
          </div>
        </div>
      </div>
    </div>
  );
}
