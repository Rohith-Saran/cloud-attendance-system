"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Student = {
  userId?: string;
  studentId?: string;
  email?: string;
  name?: string;
};

type TodayRecord = { studentId: string; status?: string; method?: string };

type WifiHint = "wifi" | "manual" | "offcampus";

function sidOf(s: Student, idx: number) {
  return String(s.userId ?? s.studentId ?? s.email ?? `row-${idx}`);
}

type Mark = { studentId: string; status: "P" | "A" | "L" };

function rowSurface(args: { status: Mark["status"]; hint: WifiHint | null }) {
  if (!args.hint) {
    if (args.status === "P") {
      return "border-l-[6px] border-l-emerald-500 bg-gradient-to-r from-emerald-50 via-white to-white";
    }
    if (args.status === "A") {
      return "border-l-[6px] border-l-rose-500 bg-gradient-to-r from-rose-50 via-white to-white";
    }
    return "border-l-[6px] border-l-amber-300 bg-gradient-to-r from-yellow-50 via-white to-white";
  }
  if (args.hint === "wifi") return "border-l-[6px] border-l-sky-500 bg-gradient-to-r from-sky-50 via-white to-white";
  if (args.hint === "manual") return "border-l-[6px] border-l-amber-400 bg-gradient-to-r from-amber-50 via-white to-white";
  return "border-l-[6px] border-l-rose-600 bg-gradient-to-r from-rose-50 via-white to-white";
}

function hintFromRecords(rec?: TodayRecord | null): WifiHint | null {
  if (!rec) return "manual";
  const method = String(rec.method || "");
  const status = String(rec.status || "P");

  if (method === "wifi-auto" && status === "P") return "wifi";
  if (method === "wifi-auto" && status === "A") return "offcampus"; // heuristic for “not verified on-campus” overlays
  // Any other definitive record clears the Wifi hint ribbons (still color-coded via status accents)
  return null;
}

export default function MarkAttendance({ classId }: { classId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [hints, setHints] = useState<Record<string, WifiHint | null>>({});
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const hydrate = useCallback((list: Student[], records: TodayRecord[]) => {
    const recBySid = new Map(records.map((r) => [String(r.studentId), r]));

    const nextMarks: Record<string, Mark> = {};
    const nextHints: Record<string, WifiHint | null> = {};

    list.forEach((s, idx) => {
      const sid = sidOf(s, idx);
      const rec = recBySid.get(sid) ?? null;
      nextHints[sid] = hintFromRecords(rec || undefined);

      const inferred =
        String(rec?.status || "P").toUpperCase() === "A"
          ? "A"
          : String(rec?.status || "P").toUpperCase() === "L"
            ? "L"
            : "P";
      nextMarks[sid] = { studentId: sid, status: inferred };
    });

    setHints(nextHints);
    setMarks(nextMarks);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sRes, tRes] = await Promise.all([
        fetch(`/api/students?classId=${encodeURIComponent(classId)}`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/attendance/today?classId=${encodeURIComponent(classId)}`, {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const sJson = await sRes.json().catch(() => ({}));
      const tJson = await tRes.json().catch(() => ({}));
      if (cancelled) return;

      const list = (sJson.students || []) as Student[];
      setStudents(list);
      hydrate(list, (tJson.records || []) as TodayRecord[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, hydrate]);

  function pushToast(next: string) {
    setToast(next);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200) as unknown as number;
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!students.length) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(students.length - 1, i + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(0, i - 1));
      }

      const k = e.key.toLowerCase();
      if (k === "p" || k === "a" || k === "l") {
        e.preventDefault();
        const s = students[focusedIdx];
        if (!s) return;
        const sid = sidOf(s, focusedIdx);
        const status = k === "p" ? ("P" as const) : k === "a" ? ("A" as const) : ("L" as const);
        setMarks((m) => ({
          ...m,
          [sid]: { studentId: sid, status },
        }));

        setFocusedIdx((i) => Math.min(students.length - 1, i + 1));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedIdx, students]);

  useEffect(() => {
    const row = document.querySelector(`[data-row-index="${focusedIdx}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIdx]);

  function setAllPresent() {
    const next: Record<string, Mark> = {};
    students.forEach((s, idx) => {
      const sid = sidOf(s, idx);
      next[sid] = { studentId: sid, status: "P" };
    });
    setMarks(next);
    pushToast("All students preset to Present — adjust absentees/leaves.");
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const payload = {
        classId,
        marks: Object.values(marks).map((m) => ({ studentId: m.studentId, status: m.status })),
      };
      const res = await fetch(`/api/attendance/bulk-mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      pushToast(`Saved ${data.written} records to DynamoDB.`);
    } catch (err: any) {
      pushToast(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  const legend = useMemo(
    () => [
      { dot: "bg-sky-500", label: "Auto-mark verified (campus ping)" },
      { dot: "bg-amber-400", label: "Manual verification likely" },
      { dot: "bg-rose-700", label: "Off-campus WiFi heuristic" },
    ],
    [],
  );

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_22px_60px_-30px_rgb(30_41_59/0.65)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Layer 1 · High-speed roster
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Mark attendance · <span className="text-indigo-700">{classId}</span>
          </div>
          <div className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Every student arrives as <span className="font-semibold">Present</span>. Layer 2 uses blue badges for Wi‑Fi auto marks;
            amber flags mean you should double-check roster matches reality.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={setAllPresent}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit attendance"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {legend.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700"
          >
            <span className={`h-3 w-3 rounded-full ${item.dot}`} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <div>Student · Insight</div>
          <div className="justify-self-end pr-10">Attendance</div>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          {!students.length ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading students… (authenticated API + `classId`)
            </div>
          ) : (
            students.map((s, idx) => {
              const sid = sidOf(s, idx);
              const mark = marks[sid] || { studentId: sid, status: "P" as const };
              const h = hints[sid] ?? null;
              const accent: WifiHint | null =
                h === "manual" ? "manual" : h === "offcampus" ? "offcampus" : h === "wifi" && mark.status === "P" ? "wifi" : null;

              return (
                <div
                  key={sid}
                  data-row-index={idx}
                  className={[
                    "grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 transition",
                    rowSurface({
                      status: mark.status,
                      hint: accent,
                    }),
                    idx === focusedIdx ? "ring-2 ring-indigo-200" : "",
                    idx !== students.length - 1 ? "border-b border-slate-50" : "",
                  ].join(" ")}
                >
                  <button type="button" className="text-left" onClick={() => setFocusedIdx(idx)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">{s.name || sid}</div>
                      {hints[sid] === "wifi" && mark.status === "P" ? (
                        <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                          Wi‑Fi auto
                        </span>
                      ) : null}
                      {hints[sid] === "manual" ? (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                          Manual check
                        </span>
                      ) : null}
                      {hints[sid] === "offcampus" ? (
                        <span className="rounded-full bg-rose-700 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                          Off-campus
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">{s.email || ""}</div>
                  </button>

                  <div className="justify-self-end">
                    <div className="inline-flex rounded-xl border border-slate-100 bg-white/70 p-1 shadow-sm backdrop-blur">
                      <button
                        type="button"
                        onClick={() => setMarks((m) => ({ ...m, [sid]: { studentId: sid, status: "P" } }))}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-semibold",
                          mark.status === "P" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarks((m) => ({ ...m, [sid]: { studentId: sid, status: "A" } }))}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-semibold",
                          mark.status === "A" ? "bg-rose-600 text-white" : "text-slate-600 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarks((m) => ({ ...m, [sid]: { studentId: sid, status: "L" } }))}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-semibold",
                          mark.status === "L" ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="font-medium">
          Shortcuts:&nbsp;<span className="font-semibold text-slate-800">P</span> present ·{" "}
          <span className="font-semibold text-slate-800">A</span> absent ·{" "}
          <span className="font-semibold text-slate-800">L</span> leave · arrows move focus · auto-advances roster
        </div>
      </div>

      {toast ? (
        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-900 shadow-sm">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
