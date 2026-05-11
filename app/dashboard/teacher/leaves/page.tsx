"use client";

import { useEffect, useState } from "react";

type Leave = {
  leaveId: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
};

export default function TeacherLeavesPage() {
  const [rows, setRows] = useState<Leave[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/leaves", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setRows(Array.isArray(data.leaves) ? data.leaves : []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function review(leaveId: string, verdict: "approved" | "rejected") {
    setStatus(null);
    const res = await fetch("/api/leaves", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaveId, status: verdict }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setStatus(data.error || "Could not review");
    else setStatus(`${verdict} · ${leaveId.slice(0, 8)}…`);
    await refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Leaves</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Requests inbox</div>
        <div className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Approve compassionate absences ahead of Dynamo persistence — this inbox already exercises the PATCH contract for future
          `Leaves` tables.
        </div>
      </div>

      {status ? (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-950">
          {status}
        </div>
      ) : null}

      <div className="overflow-auto rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">Dates</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.leaveId} className="border-t border-slate-100 align-top">
                  <td className="px-5 py-4 font-mono text-xs">{r.studentId}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-slate-700">
                    {r.fromDate} → {r.toDate}
                  </td>
                  <td className="px-5 py-4 text-slate-700">{r.reason}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        r.status === "pending"
                          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                          : r.status === "approved"
                            ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
                            : "bg-rose-100 text-rose-900 ring-1 ring-rose-200",
                      ].join(" ")}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                        disabled={r.status !== "pending"}
                        onClick={() => review(r.leaveId, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
                        disabled={r.status !== "pending"}
                        onClick={() => review(r.leaveId, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-slate-100">
                <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={5}>
                  No pending requests — students can submit from their dashboard card.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
