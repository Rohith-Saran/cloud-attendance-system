"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { DASHBOARD_ROUTES, resolveDashboardRole } from "~/lib/dashboardRoutes";


function cx(...bits: Array<string | false | null | undefined>) {
  return bits.filter(Boolean).join(" ");
}

export default function DashboardNav() {
  const pathname = usePathname();
  const { data } = useSession();

  const role = resolveDashboardRole((data?.user as any)?.role);
  const routes = role ? DASHBOARD_ROUTES[role] : [];

  return (
    <>
      <nav aria-label="Section pages" className="md:hidden sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200/85">Jump</div>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {routes.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={`m-${item.href}`}
                  href={item.href}
                  className={cx(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    active
                      ? "bg-indigo-500 text-white shadow-sm shadow-black/35"
                      : "bg-white/8 text-white/88 ring-1 ring-white/10 hover:bg-white/12",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-slate-200/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-indigo-200/70">Attendance</div>
          <div className="mt-2 text-xl font-semibold leading-tight">Smart campus suite</div>
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-indigo-100/90 backdrop-blur">
            <div className="truncate font-medium">{data?.user?.name ?? "Guest"}</div>
            <div className="truncate text-xs text-indigo-200/80">{data?.user?.email}</div>
            <div className="mt-2 inline-flex rounded-full bg-indigo-500/25 px-2 py-0.5 text-[11px] font-medium capitalize text-indigo-100 ring-1 ring-indigo-300/35">
              {role ?? "visitor"}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 pb-4">
          <ul className="space-y-1">
            {routes.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cx(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                      active
                        ? "bg-white/12 text-white ring-1 ring-white/18"
                        : "text-white/72 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-300/85" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/signin" })}
            className="w-full rounded-lg bg-white/9 px-3 py-2 text-sm font-medium text-white hover:bg-white/14"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
