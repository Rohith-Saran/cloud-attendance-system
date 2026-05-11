"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  breadcrumbsFor,
  DASHBOARD_ROUTES,
  neighborsFor,
  resolveDashboardRole,
  roleForDashboardPath,
} from "~/lib/dashboardRoutes";

export default function DashboardPageChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { status, data } = useSession();

  const role = resolveDashboardRole((data?.user as any)?.role);
  const sectionRoleFromPath = roleForDashboardPath(pathname);

  if (status !== "authenticated" || !role || !sectionRoleFromPath || sectionRoleFromPath !== role) {
    return children;
  }

  const breadcrumbs = breadcrumbsFor(role, pathname);
  const neighbors = neighborsFor(role, pathname);
  const routes = DASHBOARD_ROUTES[role];

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm shadow-sm backdrop-blur">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600">
          {breadcrumbs.map((c, i) => {
            const last = i === breadcrumbs.length - 1;
            return (
              <li key={c.href + i} className="flex items-center gap-x-2">
                {i > 0 ? <span className="text-slate-300">/</span> : null}
                {last ? (
                  <span className="font-semibold text-slate-950">{c.label}</span>
                ) : (
                  <Link href={c.href} className="font-medium hover:text-indigo-700 hover:underline">
                    {c.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-3 hidden flex-wrap gap-2 md:flex">
          {routes.map((r) => {
            const active = pathname === r.href || pathname.startsWith(`${r.href}/`);
            return (
              <Link
                key={r.href}
                href={r.href}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-slate-200/80 transition hover:bg-indigo-50 hover:text-indigo-900 hover:ring-indigo-200",
                  active ? "bg-indigo-600 text-white ring-indigo-600 hover:bg-indigo-700" : "bg-white text-slate-700",
                ].join(" ")}
              >
                {r.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div>{children}</div>

      {(neighbors.prev || neighbors.next) && (
        <div className="grid gap-3 border-t border-slate-200/70 pt-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Previous</div>
            {neighbors.prev ? (
              <Link href={neighbors.prev.href} className="mt-2 block text-base font-semibold text-slate-900 hover:text-indigo-700">
                ← {neighbors.prev.label}
              </Link>
            ) : (
              <div className="mt-2 text-sm text-slate-400">You’re at the first page in this section.</div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next</div>
            {neighbors.next ? (
              <Link href={neighbors.next.href} className="mt-2 block text-base font-semibold text-slate-900 hover:text-indigo-700 sm:float-right">
                {neighbors.next.label} →
              </Link>
            ) : (
              <div className="mt-2 text-sm text-slate-400 sm:float-right">You’re at the last page in this section.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
