"use client";

import { useState } from "react";

export default function AdminReportsPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function download(format: "pdf" | "csv") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/attendance/report", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: "class-a", format }),
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
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Reports</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">PDF + CSV pipelines</div>
        <div className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          The API generates blobs with <span className="font-semibold text-slate-900">pdfkit</span> / csv-writer, uploads to a
          private bucket, and returns short-lived links.
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => download("pdf")}
            className="rounded-2xl bg-rose-700 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
          >
            Download PDF sample
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => download("csv")}
            className="rounded-2xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            Download CSV sample
          </button>
        </div>

        {msg ? <div className="mt-4 text-sm text-slate-700">{msg}</div> : null}

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Set <code className="mx-1 rounded bg-white px-1 font-mono text-xs">AWS_S3_BUCKET_NAME</code>
          &nbsp;before expecting real uploads. Demo mode still returns reports when tables are offline.
        </div>
      </div>
    </div>
  );
}
