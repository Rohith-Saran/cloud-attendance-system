export type DashboardRole = "admin" | "teacher" | "student";

export type DashboardRouteDef = {
  href: string;
  label: string;
  crumb: string;
};

export const DASHBOARD_ROUTES: Record<DashboardRole, DashboardRouteDef[]> = {
  admin: [
    { href: "/dashboard/admin", label: "Overview", crumb: "Admin overview" },
    { href: "/dashboard/admin/students", label: "Students", crumb: "Students" },
    { href: "/dashboard/admin/reports", label: "Reports", crumb: "Reports" },
  ],
  teacher: [
    { href: "/dashboard/teacher", label: "Overview", crumb: "Teacher overview" },
    { href: "/dashboard/teacher/mark", label: "Mark attendance", crumb: "Mark attendance" },
    { href: "/dashboard/teacher/leaves", label: "Leave requests", crumb: "Leave requests" },
  ],
  student: [
    { href: "/dashboard/student", label: "Home", crumb: "Student home" },
    { href: "/dashboard/student/attendance", label: "My attendance", crumb: "My attendance" },
  ],
};

export function resolveDashboardRole(role: unknown): DashboardRole | null {
  const r = String(role || "").trim();
  if (r === "admin" || r === "teacher" || r === "student") return r;
  return null;
}

export function roleForDashboardPath(pathname: string): DashboardRole | null {
  const p = pathname.split("?")[0] ?? pathname;
  if (p.startsWith("/dashboard/admin")) return "admin";
  if (p.startsWith("/dashboard/teacher")) return "teacher";
  if (p.startsWith("/dashboard/student")) return "student";
  return null;
}

export function normalizePath(pathname: string): string {
  const p = pathname.split("?")[0] ?? pathname;
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

export function routeIndex(role: DashboardRole, pathname: string): number {
  const p = normalizePath(pathname);
  const routes = DASHBOARD_ROUTES[role];

  const exact = routes.findIndex((r) => r.href === p);
  if (exact !== -1) return exact;

  let bestIdx = 0;
  let bestLen = -1;
  routes.forEach((r, i) => {
    if (!p.startsWith(`${r.href}/`)) return;
    if (r.href.length <= bestLen) return;
    bestLen = r.href.length;
    bestIdx = i;
  });
  if (bestLen >= 0) return bestIdx;

  return 0;
}

export function breadcrumbsFor(role: DashboardRole, pathname: string): { href: string; label: string }[] {
  const p = normalizePath(pathname);
  const routes = DASHBOARD_ROUTES[role];
  const exactIdx = routes.findIndex((r) => r.href === p);
  const first = routes[0]!;
  const out: { href: string; label: string }[] = [{ href: "/dashboard", label: "Dashboard" }];

  if (exactIdx === -1 || exactIdx === 0) {
    const idx = routeIndex(role, pathname);
    out.push(routes[idx]!);
    return dedupeByHref(out);
  }

  out.push(first);
  out.push(routes[exactIdx]!);
  return dedupeByHref(out);
}

function dedupeByHref(items: { href: string; label: string }[]) {
  return items.filter((c, i, a) => (i === 0 ? true : c.href !== a[i - 1]?.href));
}

export function neighborsFor(role: DashboardRole, pathname: string): {
  prev: DashboardRouteDef | null;
  next: DashboardRouteDef | null;
} {
  const idx = routeIndex(role, pathname);
  const routes = DASHBOARD_ROUTES[role];
  return {
    prev: idx > 0 ? routes[idx - 1]! : null,
    next: idx < routes.length - 1 ? routes[idx + 1]! : null,
  };
}
