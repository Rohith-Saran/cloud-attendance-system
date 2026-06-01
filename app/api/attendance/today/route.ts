import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { queryItems, scanItems } from "~/lib/aws/dynamodb";
import fs from "fs";
import path from "path";

const ATT_TABLE = process.env.DYNAMODB_ATTENDANCE_TABLE || "Attendance";
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || process.env.DYNAMODB_TABLE_USERS || "Users";
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

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
    // 1. Get all actually registered students in this class
    let registeredStudents: any[] = [];
    
    const usersResp = await scanItems({ TableName: USERS_TABLE });
    if (usersResp && Array.isArray(usersResp.Items) && usersResp.Items.length > 0) {
      registeredStudents = usersResp.Items.filter(
        (u: any) => u.role === "student" && String(u.classId ?? "") === classId
      );
    } else {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, "utf-8");
        const localUsers = raw ? JSON.parse(raw) : [];
        registeredStudents = localUsers.filter(
          (u: any) => u.role === "student" && String(u.classId ?? "") === classId
        );
      }
    }

    // 2. Query today's attendance records from DynamoDB
    let dbRecords: any[] = [];
    if (process.env.DYNAMODB_ATTENDANCE_TABLE) {
      const resp: any = await queryItems({
        TableName: ATT_TABLE,
        KeyConditionExpression: "classId = :cid AND begins_with(datestudentId, :datePrefix)",
        ExpressionAttributeValues: {
          ":cid": classId,
          ":datePrefix": d,
        },
      });
      dbRecords = resp.Items || [];
    }

    // 3. For each registered student, find their attendance record or show absent/unmarked
    const records = registeredStudents.map((stud) => {
      const existing = dbRecords.find((rec: any) => String(rec.studentId) === stud.userId);
      if (existing) return existing;

      return {
        studentId: stud.userId,
        date: d,
        classId,
        status: "A",
        method: "unmarked",
      };
    });

    return NextResponse.json({ date: d, classId, records });
  } catch (err) {
    console.error("attendance today query", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
