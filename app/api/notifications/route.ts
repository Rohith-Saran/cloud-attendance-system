import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/** In-memory placeholder until DynamoDB Notifications is wired */
const BY_USER = new Map<string, { unread: number; alerts: string[] }>();

export async function GET(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = jwt.sub ?? (jwt.email as string) ?? "guest";
  if (!BY_USER.has(id)) {
    BY_USER.set(id, { unread: 0, alerts: ["Welcome to Smart Attendance."] });
  }
  const n = BY_USER.get(id)!;
  return NextResponse.json({ unread: n.unread, alerts: n.alerts });
}
