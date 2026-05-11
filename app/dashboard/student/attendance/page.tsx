"use client";

import dynamic from "next/dynamic";
import QRScannerPane from "~/components/QRScanner";
import { useState } from "react";

const SubjectPieChart = dynamic(() => import("~/components/charts/SubjectPieChart"), { ssr: false });

export default function StudentAttendancePage() {
  const breakdown = [
    { name: "Present", value: 72 },
    { name: "Absent", value: 18 },
    { name: "Leave", value: 10 },
  ];

  const subjects: Array<{ name: string; pct: number }> = [
    { name: "Cloud Architecture", pct: 88 },
    { name: "Data Engineering", pct: 72 },
    { name: "Math IV", pct: 64 },
    { name: "Networks Lab", pct: 91 },
    { name: "Physics", pct: 69 },
    { name: "Ethics Seminar", pct: 95 },
  ];

  const risky = subjects.filter((s) => s.pct < 75);

  const [leave, setLeave] = useState({ from: "", to: "", reason: "", status: "" });

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    setLeave((p) => ({ ...p, status: "Saving…" }));
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate: leave.from, toDate: leave.to, reason: leave.reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      setLeave({ from: "", to: "", reason: "", status: "Submitted ✔" });
    } catch (err: any) {
      setLeave((p) => ({ ...p, status: err?.message || String(err) }));
    }
  }

  async function downloadPdf() {
    try {
      const res = await fetch("/api/attendance/report", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pdf", classId: "class-a" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.url) throw new Error(data.error || "Unable to fetch URL");
      const a = document.createElement("a");
      a.href = data.url;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.click();
    } catch (e: any) {
      window.alert(e?.message || String(e));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Attendance</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your academic footprint</div>
        <div className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Charts update from aggregated Dynamo queries; projector QR validates both HMAC freshness and Wi-Fi tenancy before writing a
          record.
        </div>
      </div>

      {risky.length ? (
        <div className="rounded-3xl border border-rose-200/70 bg-rose-50 px-5 py-4 text-sm text-rose-950 shadow-sm">
          <div className="font-semibold">Heads-up — attendance is under 75% in:</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {risky.map((s) => (
              <span
                key={s.name}
                className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-rose-900 ring-1 ring-rose-200"
              >
                {s.name} · {s.pct}%
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Mix — last 90 days</div>
          <div className="mt-6">
            <SubjectPieChart data={breakdown} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-2 py-3">
              <div className="text-xs font-semibold text-emerald-700">Presence</div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-emerald-900">82%</div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-2 py-3">
              <div className="text-xs font-semibold text-indigo-700">Streak</div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-indigo-900">13d</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-2 py-3">
              <div className="text-xs font-semibold text-slate-600">Tier</div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900">Silver</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => downloadPdf()}
            className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Download attendance PDF (S3 URL)
          </button>
        </div>

        <QRScannerPane />
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Per-subject completeness</div>
        <div className="mt-4 space-y-4">
          {subjects.map((s) => (
            <div key={s.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-900">{s.name}</span>
                <span className="tabular-nums font-semibold text-slate-700">{s.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className={[
                    "h-2 rounded-full",
                    s.pct >= 85 ? "bg-emerald-500" : s.pct >= 75 ? "bg-indigo-500" : "bg-rose-500",
                  ].join(" ")}
                  style={{ width: `${Math.min(100, Math.max(0, s.pct))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="leave" className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Leave request</div>
        <div className="mt-2 text-sm text-slate-600">Submit rationale + date span for teacher approval.</div>
        <form onSubmit={submitLeave} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Start date
            <input
              type="date"
              value={leave.from}
              onChange={(e) => setLeave((p) => ({ ...p, from: e.target.value }))}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            End date
            <input
              type="date"
              value={leave.to}
              onChange={(e) => setLeave((p) => ({ ...p, to: e.target.value }))}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            />
          </label>

          <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reason
            <textarea
              value={leave.reason}
              onChange={(e) => setLeave((p) => ({ ...p, reason: e.target.value }))}
              required
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Submit leave
            </button>
            {leave.status ? <span className="text-sm text-slate-600">{leave.status}</span> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
