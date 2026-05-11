import DashboardNav from "~/components/DashboardNav";
import DashboardPageChrome from "~/components/DashboardPageChrome";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 text-slate-900 md:flex-row">
      <DashboardNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/65">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-indigo-700/80">
                Campus cloud
              </div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                Smart attendance · AWS backbone
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm">
              <span className="font-semibold text-slate-900">Flows:</span> bulk roster · silent Wi‑Fi pings · rotating QR
              anti-proxy
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-6 pb-10 pt-6">
          <DashboardPageChrome>{children}</DashboardPageChrome>
        </main>
      </div>
    </div>
  );
}
