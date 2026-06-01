"use client";

import { useEffect, useMemo, useState } from "react";

type AttendanceRow = {
  studentId?: string;
  date?: string;
  status?: string;
  method?: string;
};

type AttendanceApiResponse = {
  date?: string;
  classId?: string;
  records?: AttendanceRow[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TeacherReportsPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<string>(todayISO());
  const [toDate, setToDate] = useState<string>(todayISO());
  const [classId, setClassId] = useState<string>("class-a");
  const [subject, setSubject] = useState<string>("Distributed Systems");
  const [studentSearch, setStudentSearch] = useState<string>("");

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [tableBusy, setTableBusy] = useState(false);

  const classes = useMemo(() => ["class-a", "class-b", "class-c"], []);
  const subjects = useMemo(() => [
    "Distributed Systems",
    "Cloud Architecture",
    "Data Engineering",
    "Networks Lab",
    "Math IV",
    "Physics",
    "Ethics Seminar",
  ], []);

  async function fetchTablePreview() {
    setTableBusy(true);
    setMsg(null);
    try {
      const date = toDate || todayISO();
      const res = await fetch(`/api/attendance/today?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data: AttendanceApiResponse = await res.json().catch(() => ({} as any));
      const list = Array.isArray(data.records) ? data.records : [];
      setRows(list);
    } catch (e: any) {
      setMsg(e?.message || String(e));
      setRows([]);
    } finally {
      setTableBusy(false);
    }
  }

  useEffect(() => {
    void (async () => {
      await fetchTablePreview();
    })();
  }, [classId, toDate]);

  const filtered = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.studentId || "").toLowerCase().includes(q));
  }, [rows, studentSearch]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const present = filtered.filter((r) => String(r.status).toUpperCase() === "P" || String(r.status).toUpperCase() === "PRESENT").length;
    const absent = filtered.filter((r) => String(r.status).toUpperCase() === "A" || String(r.status).toUpperCase() === "ABSENT").length;
    const late = filtered.filter((r) => String(r.status).toUpperCase() === "L" || String(r.status).toUpperCase() === "LATE").length;
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, rate };
  }, [filtered]);

  async function download(format: "pdf" | "csv") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/attendance/report", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentSearch.trim() ? undefined : undefined,
          classId,
          dateRange: { fromDate, toDate },
          subject,
          format,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Report failed (${res.status})`);
      if (!data.url) throw new Error("Missing pre-signed URL");

      const a = document.createElement("a");
      a.href = data.url as string;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.click();
      setMsg("Opening pre-signed download…");
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Teacher</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Attendance Reports</div>
        <div className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Filter by class, date range, subject, and student search — then export PDF/CSV reports.
        </div>
      </div>

      {/* Visual Analytics Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Present Rate</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-emerald-950 tabular-nums">{stats.rate}%</span>
            <span className="text-xs font-medium text-emerald-800/80">avg. attendance</span>
          </div>
          <div className="mt-2 text-xs text-emerald-700/85">For selected range &amp; class</div>
        </div>

        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-800">Total Scans</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-indigo-950 tabular-nums">{stats.total}</span>
            <span className="text-xs font-medium text-indigo-800/80">records</span>
          </div>
          <div className="mt-2 text-xs text-indigo-700/85">Scanned &amp; registered pings</div>
        </div>

        <div className="rounded-3xl border border-teal-100 bg-teal-50/50 p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-800">Present Logs</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-teal-950 tabular-nums">{stats.present}</span>
            <span className="text-xs font-medium text-teal-800/80">active</span>
          </div>
          <div className="mt-2 text-xs text-teal-700/85">Students marked present</div>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-800">Absences</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-rose-950 tabular-nums">{stats.absent}</span>
            <span className="text-xs font-medium text-rose-800/80">unmarked</span>
          </div>
          <div className="mt-2 text-xs text-rose-700/85">Absenteeism alert logs</div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">From</div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">To</div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            />
          </label>

          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class</div>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            >
              {classes.map((c) => (
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
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2 xl:col-span-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student search</div>
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by studentId"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {tableBusy ? "Loading table preview…" : `Showing ${filtered.length} rows (preview)`}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => download("csv")}
              className="rounded-2xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {busy ? "Generating CSV…" : "Export CSV"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => download("pdf")}
              className="rounded-2xl bg-rose-700 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {busy ? "Generating PDF…" : "Export PDF"}
            </button>
          </div>
        </div>

        {msg ? <div className="mt-4 text-sm text-slate-700">{msg}</div> : null}

        <div className="mt-6 overflow-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((r, idx) => {
                  const status = String(r.status || "");
                  const pill =
                    status === "P"
                      ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
                      : status === "A"
                        ? "bg-rose-100 text-rose-900 ring-1 ring-rose-200"
                        : "bg-amber-100 text-amber-900 ring-1 ring-amber-200";

                  return (
                    <tr key={`${r.studentId || idx}-${r.date || idx}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-mono text-xs">{r.studentId}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill}`}>{status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.method || ""}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={4}>
                    No attendance rows to preview for the current selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
