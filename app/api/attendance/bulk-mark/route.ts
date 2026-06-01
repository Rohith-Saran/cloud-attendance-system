import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { batchWriteItems } from "~/lib/aws/dynamodb";

const ATTENDANCE_TABLE = process.env.DYNAMODB_ATTENDANCE_TABLE || "Attendance";

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = token.role ?? (Array.isArray((token as any).groups) ? (token as any).groups[0] : (token as any).groups);
  if (role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const classId = body.classId;
  const marks = body.marks || [];

  if (!classId || !Array.isArray(marks)) return NextResponse.json({ error: "classId and marks required" }, { status: 400 });

  // Transform marks into attendance items
  const date = todayDate();
  const teacherId = String(token.sub ?? token.email ?? "");

  const items = marks.map((m: any) => {
    const studentId = m.studentId;
    if (!studentId) return null;

    return {
      classId,
      datestudentId: `${date}#${studentId}`,
      studentId,
      date,
      status: m.status || "P",
      markedAt: new Date().toISOString(),
      markedBy: teacherId,
      method: m.method || "bulk",
    };
  });

  const filteredItems = items.filter(Boolean) as any[];

  try {
    await batchWriteItems(ATTENDANCE_TABLE, filteredItems);
    return NextResponse.json({ ok: true, written: filteredItems.length });
  } catch (err) {
    console.error("bulk-mark error", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
