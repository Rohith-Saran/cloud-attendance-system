"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";

type SubjectStat = {
  subject: string;
  attended: number;
  total: number;
  percentage: number;
};

type HistoryRow = {
  date: string;
  subject: string;
  status: string; // P | A | L
};

type StudentHomeData = {
  overallPercentage: number;
  subjects: SubjectStat[];
};

function pillForStatus(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "P") {
    return { label: "Present", classes: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200" };
  }
  if (s === "A") {
    return { label: "Absent", classes: "bg-rose-100 text-rose-900 ring-1 ring-rose-200" };
  }
  return { label: "Leave", classes: "bg-amber-100 text-amber-900 ring-1 ring-amber-200" };
}

function scoreColorClasses(pct: number) {
  if (pct >= 75) return "text-emerald-700";
  if (pct >= 60) return "text-amber-600";
  return "text-rose-700";
}

function canShowRiskBanner(subjects: SubjectStat[]) {
  return subjects.some((s) => s.percentage < 75);
}

function riskSubjectName(subjects: SubjectStat[]) {
  const risky = subjects
    .filter((s) => s.percentage < 75)
    .sort((a, b) => a.percentage - b.percentage);
  return risky[0]?.subject ?? "your classes";
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto mt-16 w-[min(720px,96vw)] rounded-3xl bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default function StudentHomePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentHomeData | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [dismissed, setDismissed] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leave, setLeave] = useState({ fromDate: "", toDate: "", reason: "", status: "" });

  const todayLabel = useMemo(() => new Date().toLocaleDateString(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sRes, hRes] = await Promise.all([
          fetch("/api/attendance/student", { credentials: "include", cache: "no-store" }),
          fetch("/api/attendance/history", { credentials: "include", cache: "no-store" }),
        ]);

        const sJson = (await sRes.json().catch(() => ({}))) as Partial<StudentHomeData>;
        const hJson = (await hRes.json().catch(() => ({}))) as { records?: HistoryRow[] };

        if (cancelled) return;

        const subjects = Array.isArray(sJson.subjects) ? (sJson.subjects as SubjectStat[]) : [];
        const overallPercentage = typeof sJson.overallPercentage === "number" ? sJson.overallPercentage : 0;

        setData({ overallPercentage, subjects });
        setHistory(Array.isArray(hJson.records) ? hJson.records : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = data?.subjects ?? [];
  const overallPercentage = data?.overallPercentage ?? 0;

  const showRisk = useMemo(() => canShowRiskBanner(subjects), [subjects]);
  const riskySubject = useMemo(() => riskSubjectName(subjects), [subjects]);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    setLeave((p) => ({ ...p, status: "Submitting…" }));
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate: leave.fromDate, toDate: leave.toDate, reason: leave.reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      setLeave({ fromDate: "", toDate: "", reason: "", status: "Submitted ✔" });
      setLeaveOpen(false);
    } catch (e: any) {
      setLeave((p) => ({ ...p, status: e?.message || String(e) }));
    }
  }

  async function downloadMyReport() {
    try {
      // API currently expects { classId, format } via POST.
      // For now, trigger same behavior by requesting the existing attendance report endpoint.
      // In offline mode, backend returns mock report.
      const res = await fetch("/api/attendance/report", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pdf", studentId: "me", classId: "class-a" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!json.url) throw new Error(json.error || "Unable to fetch report URL");
      const a = document.createElement("a");
      a.href = json.url;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.click();
    } catch (e: any) {
      window.alert(e?.message || String(e));
    }
  }

  return (
    <div className="space-y-8">
      {/* SECTION 1 — Welcome Card */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Student</div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="text-2xl font-semibold tracking-tight text-slate-950">Hello! 👋</div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall attendance</div>
              <div className={`mt-1 text-4xl font-bold tabular-nums ${scoreColorClasses(overallPercentage)}`}>{overallPercentage}%</div>
            </div>
          </div>
          <div className="mt-4 text-sm leading-relaxed text-slate-600">
            Today is <span className="font-semibold text-slate-900">{todayLabel}</span>. Keep your streak by marking accurate attendance.
          </div>
        </div>

        {/* Loading skeleton right card */}
        <div className="rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-indigo-600 to-indigo-950 p-6 text-white shadow-xl shadow-indigo-900/25">
          <div className="text-sm text-indigo-50/85">Quick status</div>
          <div className="mt-3 text-4xl font-bold tabular-nums">{loading ? "…" : `${overallPercentage}%`}</div>
          <div className="mt-2 text-sm text-indigo-50/80">Auto Wi‑Fi pings update records silently (off-campus ignored).</div>
        </div>
      </div>

      {/* SECTION 2 — Alert Banner */}
      {loading ? null : showRisk && !dismissed ? (
        <div className="rounded-3xl border border-rose-200/70 bg-rose-50 px-5 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-rose-900">⚠️ Warning: You are below 75% in {riskySubject}.</div>
              <div className="mt-1 text-sm text-rose-900">Risk of detention!</div>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-xl bg-white/70 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-white"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      {/* SECTION 3 — Subject-wise Attendance */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(loading ? Array.from({ length: 6 }) : subjects).map((s: any, i: number) => {
          const stat: SubjectStat | null = loading ? null : (s as SubjectStat);
          const pct = stat?.percentage ?? 0;
          const level = pct >= 75 ? "emerald" : pct >= 60 ? "amber" : "rose";
          const barColor =
            level === "emerald" ? "bg-emerald-500" : level === "amber" ? "bg-amber-500" : "bg-rose-500";

          return (
            <div key={loading ? `sk-${i}` : (stat?.subject ?? `sk-${i}`)} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{loading ? "Loading…" : (stat?.subject ?? "")}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {loading ? "" : `${stat?.attended ?? 0} / ${stat?.total ?? 0} classes attended`}
                    </div>
                  </div>
                  <div className={`text-sm font-bold tabular-nums ${scoreColorClasses(pct)}`}>{loading ? "…" : `${pct}%`}</div>
                </div>

                <div className="mt-4 h-3 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full ${barColor}`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%`, transition: "width 300ms ease" }}
                  />
                </div>
            </div>
          );
        })}
      </section>

      {/* SECTION 4 — Recent Attendance History */}
      <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Recent attendance</div>
            <div className="mt-1 text-sm text-slate-600">Last 10 records</div>
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-400">—</td>
                      <td className="px-4 py-3 text-slate-400">—</td>
                      <td className="px-4 py-3 text-slate-400">—</td>
                    </tr>
                  ))
                : history.map((r, idx) => {
                    const pill = pillForStatus(r.status);
                    return (
                      <tr key={`${r.date}-${idx}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.date}</td>
                        <td className="px-4 py-3 text-slate-700">{r.subject}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill.classes}`}>{pill.label}</span>
                        </td>
                      </tr>
                    );
                  })}
              {!loading && history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">
                    No attendance records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 5 — Quick Actions */}
      <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Quick actions</div>
            <div className="mt-1 text-sm text-slate-600">Take action without leaving the page.</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setLeaveOpen(true)}
              className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Apply for Leave
            </button>
            <button
              type="button"
              onClick={downloadMyReport}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Download My Report
            </button>
          </div>
        </div>
      </section>

      {/* Leave modal */}
      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Apply for Leave</div>
            <div className="mt-1 text-sm text-slate-600">Submit date span + reason (teacher approval required).</div>
          </div>
          <button
            type="button"
            onClick={() => setLeaveOpen(false)}
            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submitLeave} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            From
            <input
              type="date"
              required
              value={leave.fromDate}
              onChange={(e) => setLeave((p) => ({ ...p, fromDate: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            To
            <input
              type="date"
              required
              value={leave.toDate}
              onChange={(e) => setLeave((p) => ({ ...p, toDate: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            />
          </label>

          <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reason
            <textarea
              required
              rows={4}
              value={leave.reason}
              onChange={(e) => setLeave((p) => ({ ...p, reason: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Submit
            </button>
            {leave.status ? <div className="text-sm font-medium text-slate-600">{leave.status}</div> : null}
          </div>
        </form>
      </Modal>
    </div>
  );
}

