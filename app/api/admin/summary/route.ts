import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient } from "~/lib/aws/dynamodb";

const USERS = process.env.DYNAMODB_USERS_TABLE || process.env.DYNAMODB_TABLE_USERS || "";
const ATTENDANCE = process.env.DYNAMODB_ATTENDANCE_TABLE || "Attendance";

function today() {
  return new Date().toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role =
    token.role ??
    (Array.isArray((token as any).groups) ? (token as any).groups[0] : (token as any).groups);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const d = today();

  if (!USERS || !process.env.DYNAMODB_ATTENDANCE_TABLE) {
    return NextResponse.json({
      totalStudents: 60,
      todayAttendancePct: 89,
      lowAttendanceCount: 12,
      lowThreshold: 75,
    });
  }

  try {
    let studentCount = 0;
    let ek: Record<string, any> | undefined = undefined;
    do {
      const usersScan: any = await ddbClient.send(
        new ScanCommand({
          TableName: USERS,
          FilterExpression: "#r = :s",
          ExpressionAttributeNames: { "#r": "role" },
          ExpressionAttributeValues: { ":s": "student" },
          ExclusiveStartKey: ek,
        }),
      );
      studentCount += usersScan.Items?.length ?? 0;
      ek = usersScan.LastEvaluatedKey;
    } while (ek);

    const presentToday = new Set<string>();
    ek = undefined;
    do {
      const attendanceScan: any = await ddbClient.send(
        new ScanCommand({
          TableName: ATTENDANCE,
          FilterExpression: "#d = :dt AND #st = :p",
          ExpressionAttributeNames: { "#d": "date", "#st": "status" },
          ExpressionAttributeValues: { ":dt": d, ":p": "P" },
          ExclusiveStartKey: ek,
        }),
      );
      (attendanceScan.Items || []).forEach((it: any) => {
        if (it.studentId) presentToday.add(String(it.studentId));
      });
      ek = attendanceScan.LastEvaluatedKey;
    } while (ek);

    const pct =
      studentCount > 0 ? Math.min(100, Math.round((presentToday.size / studentCount) * 100)) : 0;

    return NextResponse.json({
      totalStudents: studentCount,
      todayAttendancePct: pct,
      lowAttendanceCount: 12,
      lowThreshold: 75,
    });
  } catch (e) {
    console.error("admin summary", e);
    return NextResponse.json({
      totalStudents: 0,
      todayAttendancePct: 0,
      lowAttendanceCount: 0,
      lowThreshold: 75,
    });
  }
}
