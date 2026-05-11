import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ROLE_MAP: Record<string, string> = {
  "/dashboard/admin": "admin",
  "/dashboard/teacher": "teacher",
  "/dashboard/student": "student",
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Only protect /dashboard routes
  if (!url.pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // Not authenticated — redirect to NextAuth sign-in
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  // Determine required role from path prefix
  const pathParts = url.pathname.split("/").filter(Boolean);
  const prefix = pathParts.length > 1 ? `/${pathParts.slice(0, 2).join("/")}` : `/${pathParts[0]}`;

  const requiredRole = ROLE_MAP[prefix];

  // Allow if no specific role required (generic /dashboard)
  if (!requiredRole) return NextResponse.next();

  // Token may carry `role` or `groups`
  const userRole = token.role ?? (Array.isArray((token as any).groups) ? (token as any).groups[0] : (token as any).groups);

  if (!userRole) {
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  if (userRole !== requiredRole) {
    // Forbidden — redirect to their appropriate dashboard or login
    switch (userRole) {
      case "admin":
        url.pathname = "/dashboard/admin";
        break;
      case "teacher":
        url.pathname = "/dashboard/teacher";
        break;
      case "student":
      default:
        url.pathname = "/dashboard/student";
        break;
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
