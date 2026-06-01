import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { scanItems, queryItems } from "~/lib/aws/dynamodb";
import fs from "fs";
import path from "path";

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || process.env.DYNAMODB_TABLE_USERS || "Users";
const ATT_TABLE = process.env.DYNAMODB_ATTENDANCE_TABLE || "Attendance";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role =
    jwt.role ??
    (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups) ??
    "student";

  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const classId = String((jwt as any).classId ?? "class-a");
  const today = todayISO();

  try {
    // 1. Get all students in this class
    let allStudents: any[] = [];

    // Check DynamoDB Users Table
    const usersResp = await scanItems({ TableName: USERS_TABLE });
    if (usersResp && Array.isArray(usersResp.Items) && usersResp.Items.length > 0) {
      allStudents = usersResp.Items.filter(
        (u: any) => u.role === "student" && String(u.classId ?? "") === classId
      );
    } else {
      // Fallback to local users.json
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, "utf-8");
        const localUsers = raw ? JSON.parse(raw) : [];
        allStudents = localUsers.filter(
          (u: any) => u.role === "student" && String(u.classId ?? "") === classId
        );
      }
    }

    const totalStudents = allStudents.length;

    // 2. Query today's attendance for this class
    let markedToday = 0;
    const attResp = await queryItems({
      TableName: ATT_TABLE,
      KeyConditionExpression: "classId = :c",
      ExpressionAttributeValues: { ":c": classId },
    });

    const items = (attResp && attResp.Items) || [];
    const todayRecords = items.filter((it: any) => String(it.date) === today);

    // Count marked today (present or late)
    const presentIds = new Set<string>();
    for (const rec of todayRecords) {
      const status = String(rec.status || "").toUpperCase();
      if (status === "P" || status === "L" || status === "PRESENT") {
        presentIds.add(String(rec.studentId));
      }
    }
    markedToday = presentIds.size;

    // Pending: students who are not marked present/late today yet
    const pending = Math.max(0, totalStudents - markedToday);

    return NextResponse.json({
      totalStudents: totalStudents || 1, // Fallback to 1 if database is clean
      markedToday,
      pending,
    });
  } catch (err: any) {
    console.error("Teacher summary API error:", err);
    return NextResponse.json({
      totalStudents: 1,
      markedToday: 0,
      pending: 1,
    });
  }
}
