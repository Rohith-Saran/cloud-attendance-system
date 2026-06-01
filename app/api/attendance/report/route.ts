import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getToken } from "next-auth/jwt";
import { getPresignedGetUrl, uploadBufferToS3 } from "~/lib/aws/s3";
import { queryItems, scanItems } from "~/lib/aws/dynamodb";
import fs from "fs";
import path from "path";

const ATTENDANCE_TABLE = process.env.DYNAMODB_ATTENDANCE_TABLE || "Attendance";

function todayDate() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function generatePdfBuffer(rows: any[], meta: any) {
  let fontPath: string | undefined = undefined;
  const paths = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "Helvetica",
  ];
  for (const p of paths) {
    if (p === "Helvetica" || fs.existsSync(p)) {
      fontPath = p;
      break;
    }
  }

  const doc = new PDFDocument({
    margin: 40,
    font: fontPath,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const title = `Attendance Report - ${meta.classId || "all"} - ${meta.dateRange || "all"}`;
  doc.fontSize(18).text(title, { align: "center" });
  doc.moveDown();

  doc.fontSize(12);
  rows.forEach((r: any, i: number) => {
    doc.text(`${i + 1}. ${r.studentId} — ${r.date} — ${r.status} — ${r.method || ""}`);
  });

  doc.end();
  await new Promise((res) => doc.on("end", res));
  return Buffer.concat(chunks);
}

async function generateCsvBuffer(rows: any[]) {
  const header = ["studentId", "date", "status", "method"].join(",") + "\n";
  const body = rows.map((r: any) => [r.studentId, r.date, r.status, r.method || ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  return Buffer.from(header + body, "utf8");
}

export async function POST(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role =
    jwt.role ??
    (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups);
  if (!["admin", "teacher", "student"].includes(String(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { studentId, classId, dateRange, format } = body;
  const fmt = (format || "pdf").toLowerCase();

  // Fetch attendance rows. If table not configured, return mock data
  let rows: any[] = [];
  if (!process.env.DYNAMODB_ATTENDANCE_TABLE) {
    rows = (studentId ? [1, 2, 3] : [1, 2, 3, 4]).map((i) => ({ studentId: studentId || `s${100 + i}`, date: `2026-05-0${i + 1}`, status: i % 2 === 0 ? "P" : "A", method: "bulk" }));
  } else {
    try {
      const cid = String(classId || "").trim();
      if (!cid) {
        return NextResponse.json({ error: "classId required for DynamoDB reports" }, { status: 400 });
      }

      // 1. Get all actually registered students in this class
      let registeredStudents: any[] = [];
      const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || process.env.DYNAMODB_TABLE_USERS || "Users";
      const DATA_DIR = path.join(process.cwd(), "data");
      const USERS_FILE = path.join(DATA_DIR, "users.json");

      const usersResp = await scanItems({ TableName: USERS_TABLE });
      if (usersResp && Array.isArray(usersResp.Items) && usersResp.Items.length > 0) {
        registeredStudents = usersResp.Items.filter(
          (u: any) => u.role === "student" && String(u.classId ?? "") === cid
        );
      } else {
        if (fs.existsSync(USERS_FILE)) {
          const raw = fs.readFileSync(USERS_FILE, "utf-8");
          const localUsers = raw ? JSON.parse(raw) : [];
          registeredStudents = localUsers.filter(
            (u: any) => u.role === "student" && String(u.classId ?? "") === cid
          );
        }
      }

      // 2. Get all actual database attendance records for this class
      const qparams: any = {
        TableName: ATTENDANCE_TABLE,
        KeyConditionExpression: "classId = :c",
        ExpressionAttributeValues: { ":c": cid },
      };
      const resp: any = await queryItems(qparams);
      const dbRecords = resp.Items || [];

      // Parse dates from range
      const start = new Date(dateRange?.fromDate || new Date().toISOString().slice(0, 10));
      const end = new Date(dateRange?.toDate || new Date().toISOString().slice(0, 10));
      
      const dates: string[] = [];
      const temp = new Date(start);
      for (let day = 0; day < 7; day++) {
        dates.push(temp.toISOString().slice(0, 10));
        if (temp.toISOString().slice(0, 10) === end.toISOString().slice(0, 10)) break;
        temp.setDate(temp.getDate() + 1);
      }

      const generated: any[] = [];
      for (const d of dates) {
        for (const stud of registeredStudents) {
          const existing = dbRecords.find(
            (rec: any) => String(rec.studentId) === stud.userId && String(rec.date) === d
          );
          if (existing) {
            generated.push(existing);
          } else {
            generated.push({
              studentId: stud.userId,
              date: d,
              classId: cid,
              status: "A",
              method: "unmarked",
            });
          }
        }
      }

      rows = generated;
    } catch (err) {
      console.error("report query error", err);
      return NextResponse.json({ error: "failed to query" }, { status: 500 });
    }
  }

  let buffer: Buffer;
  try {
    if (fmt === "csv") buffer = await generateCsvBuffer(rows);
    else buffer = await generatePdfBuffer(rows, { classId, dateRange });
  } catch (err) {
    console.error("report generation error", err);
    return NextResponse.json({ error: "generation failed" }, { status: 500 });
  }

  const ext = fmt === "csv" ? "csv" : "pdf";
  const key = `reports/${classId || "all"}/${Date.now()}-${todayDate()}.${ext}`;

  try {
    await uploadBufferToS3(buffer, key, fmt === "csv" ? "text/csv" : "application/pdf");
    const url = await getPresignedGetUrl(key, 15 * 60);
    return NextResponse.json({ url });
  } catch (err) {
    console.warn("S3 upload failed, falling back to base64 data stream:", err);
    const mime = fmt === "csv" ? "text/csv" : "application/pdf";
    const base64Data = buffer.toString("base64");
    const url = `data:${mime};base64,${base64Data}`;
    return NextResponse.json({ url });
  }
}
