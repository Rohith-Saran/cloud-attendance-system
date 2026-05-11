import MarkAttendance from "~/components/MarkAttendance";
import QRGenerator from "~/components/QRGenerator";

export default async function TeacherMarkPage({
  searchParams,
}: {
  searchParams?: Promise<{ classId?: string; subject?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const classId = sp.classId ?? "class-a";
  const subject = sp.subject ?? "Distributed Systems";

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Teaching session</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Layers 1 · 2 · 3 unified console
        </div>
        <div className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600">
          Left: projector-safe rotating QR. Right: blazing roster controls with Wi‑Fi-informed coloring. Tune query params:&nbsp;
          <span className="font-mono text-xs text-slate-900">
            ?classId={classId}&subject=…
          </span>
          .
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="space-y-3 xl:col-span-2">
          <QRGenerator classId={classId} subject={subject} />
        </section>

        <section className="xl:col-span-3">
          <MarkAttendance classId={classId} />
        </section>
      </div>
    </div>
  );
}
