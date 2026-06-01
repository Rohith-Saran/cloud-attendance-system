import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isRequestFromCampus, getIPFromRequest } from "~/lib/ipcheck";
import { putItem } from "~/lib/aws/dynamodb";

const ATTENDANCE_TABLE = process.env.DYNAMODB_ATTENDANCE_TABLE || "Attendance";

function getCurrentPeriod() {
  // Simple period mapping by hour — replace with school schedule as needed
  const h = new Date().getHours();
  if (h >= 8 && h < 9) return "period-1";
  if (h >= 9 && h < 10) return "period-2";
  if (h >= 10 && h < 11) return "period-3";
  if (h >= 11 && h < 12) return "period-4";
  if (h >= 13 && h < 14) return "period-5";
  return `period-${h}`;
}

export async function POST(req: NextRequest) {
  // This endpoint is intended for student PWA background pings.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) return new Response(null, { status: 204 });

  const role = token.role ?? (Array.isArray((token as any).groups) ? (token as any).groups[0] : (token as any).groups) ?? "student";

  // If not a student, ignore
  if (role !== "student") return new Response(null, { status: 204 });

  // Extract student and class info from token or body
  const studentId = token.sub || token.email || token.userId;
  const body = await req.json().catch(() => ({}));
  const classId = token.classId || body.classId || body.class || "unknown-class";

  // Read IP and verify campus range
  const clientIP = getIPFromRequest(req as unknown as Request) || "";
  const onCampus = isRequestFromCampus(req as unknown as Request);

  if (!onCampus) {
    // Silently ignore when off-campus — return 204 No Content
    return new Response(null, { status: 204 });
  }

  // Mark present for current period
  const period = getCurrentPeriod();
  const date = new Date().toISOString().split("T")[0];
  const sortKey = `${date}#${studentId}`;

  const item = {
    classId,
    sortKey,
    datestudentId: sortKey,
    studentId,
    date,
    status: "P",
    markedAt: new Date().toISOString(),
    markedBy: studentId,
    method: "wifi-auto",
    methodDetail: { ip: clientIP, period },
  };

  try {
    await putItem({ TableName: ATTENDANCE_TABLE, Item: item });
    return NextResponse.json({ ok: true, marked: true }, { status: 200 });
  } catch (err) {
    console.error("auto-mark error", err);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
