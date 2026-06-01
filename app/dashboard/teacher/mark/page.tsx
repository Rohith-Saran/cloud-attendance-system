"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import QRGenerator from "~/components/QRGenerator";

const MarkAttendance = dynamic(() => import("~/components/MarkAttendance"), { ssr: false });

export default function TeacherMarkAttendancePage() {
  const [classId, setClassId] = useState<string>("class-a");
  const [subject, setSubject] = useState<string>("Distributed Systems");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const classOptions = useMemo(() => ["class-a", "class-b", "class-c"], []);
  const subjectOptions = useMemo(
    () => [
      "Distributed Systems",
      "Cloud Architecture",
      "Data Engineering",
      "Networks Lab",
      "Math IV",
      "Physics",
      "Ethics Seminar",
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Teacher Console</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Mark Attendance</div>
            <div className="mt-2 text-sm text-slate-600">Bulk present + Wi‑Fi cues + rotating QR anti-proxy.</div>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="block">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class</div>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="mt-2 w-full min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
              >
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</div>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-2 w-full min-w-[190px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
              >
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[70%,30%]">
        <section>
          {/* MarkAttendance already contains:
              - Big “Mark All Present”
              - student roster toggles P/A/L
              - submit attendance -> bulk write
              - success toast
           */}
          <MarkAttendance classId={classId} />
        </section>

        <aside>
          <div className="sticky top-24">
            <QRGenerator classId={classId} subject={subject} />
            <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-4 text-sm text-slate-600 shadow-sm">
              Students scan this to mark attendance.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

