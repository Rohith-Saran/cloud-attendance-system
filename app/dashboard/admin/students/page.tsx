"use client";

import { useMemo, useState } from "react";

type Row = Record<string, string>;

export default function AdminStudentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const preview = useMemo(() => rows.slice(0, 6), [rows]);

  async function pushToDynamo() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to import students");
      setSuccess(`Successfully imported ${data.count || rows.length} students into class roster!`);
      setRows([]);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleFile(file: File | null) {
    setError(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        const header = lines.shift();
        if (!header) throw new Error("CSV missing header");
        const cols = header.split(",").map((h) => h.trim());
        const parsed: Row[] = lines.map((line) => {
          const parts = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const obj: Row = {};
          cols.forEach((c, idx) => {
            obj[c] = parts[idx] ?? "";
          });
          return obj;
        });
        setRows(parsed);
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Students</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">CSV bulk import preview</div>
        <div className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Parses CSV client-side for instant QA. Wire this to a guarded admin API + DynamoDB batch writer when you&apos;re ready for
          production ingestion.
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Choose a roster file</div>
            <div className="mt-1 text-sm text-slate-600">
              Expected columns:&nbsp;
              <span className="font-mono text-xs text-slate-900">name,email,classId,userId</span>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
            Browse CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
        ) : null}

        <div className="mt-6 overflow-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">User ID</th>
              </tr>
            </thead>
            <tbody>
              {preview.length ? (
                preview.map((r, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3">{r.email}</td>
                    <td className="px-4 py-3">{r.classId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.userId}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={4}>
                    No file loaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {rows.length ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <div>
              Parsed <span className="font-semibold text-slate-900">{rows.length}</span> rows.
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={pushToDynamo}
              className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10 disabled:opacity-50"
            >
              {busy ? "Uploading..." : "Dynamo push & save"}
            </button>
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 font-medium">{success}</div>
        ) : null}
      </div>
    </div>
  );
}
