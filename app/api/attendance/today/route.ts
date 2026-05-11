import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { queryItems } from "~/lib/aws/dynamodb";

const ATT_TABLE = process.env.DYNAMODB_ATTENDANCE_TABLE || "Attendance";

function today() {
  return new Date().toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role =
    token.role ??
    (Array.isArray((token as any).groups) ? (token as any).groups[0] : (token as any).groups);

  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const d = url.searchParams.get("date") || today();

  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.DYNAMODB_ATTENDANCE_TABLE) {
    const demo = Array.from({ length: 12 }).map((_, i) => ({
      studentId: `s${1000 + i}`,
      sortKey: `${d}#s${1000 + i}`,
      date: d,
      classId,
      status: i % 5 === 0 ? "A" : "P",
      method: i % 3 === 0 ? "wifi-auto" : i % 3 === 1 ? "qr-scan" : "bulk",
    }));
    return NextResponse.json({ date: d, classId, records: demo });
  }

  try {
    const resp: any = await queryItems({
      TableName: ATT_TABLE,
      KeyConditionExpression: "classId = :c AND begins_with(sortKey, :pd)",
      ExpressionAttributeValues: { ":c": classId, ":pd": `${d}#` },
    });
    return NextResponse.json({ date: d, classId, records: resp.Items || [] });
  } catch (err) {
    console.error("attendance today query", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
