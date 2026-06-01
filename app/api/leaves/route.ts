import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { randomUUID } from "crypto";
import { putItem, scanItems, updateItem } from "~/lib/aws/dynamodb";

const LEAVES_TABLE = process.env.DYNAMODB_LEAVES_TABLE || "Leaves";

type LeaveRow = {
  leaveId: string;
  studentId: string;
  studentName?: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  createdAt?: string;
};

export async function GET(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role =
    jwt.role ??
    (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups) ??
    "student";

  const id = String(jwt.sub ?? jwt.email ?? jwt.userId ?? "");

  try {
    const resp = await scanItems({ TableName: LEAVES_TABLE });
    const items = ((resp && resp.Items) || []) as LeaveRow[];

    if (role === "teacher" || role === "admin") {
      // Sort so newest are at the top
      items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return NextResponse.json({ leaves: items });
    }

    // Filter for this student
    const mine = items.filter((l) => String(l.studentId) === id);
    mine.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return NextResponse.json({ leaves: mine });
  } catch (err: any) {
    console.error("GET leaves error", err);
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role =
    jwt.role ??
    (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups) ??
    "student";

  const body = await req.json().catch(() => ({}));

  if (role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = String(jwt.sub ?? jwt.email ?? jwt.userId ?? "");
  const studentName = String(jwt.name ?? jwt.email ?? "Student");

  const row: LeaveRow = {
    leaveId: randomUUID(),
    studentId: id,
    studentName,
    fromDate: body.fromDate,
    toDate: body.toDate,
    reason: body.reason || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  try {
    await putItem({ TableName: LEAVES_TABLE, Item: row });
    return NextResponse.json({ ok: true, leave: row });
  } catch (err: any) {
    console.error("POST leaves error", err);
    return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role =
    jwt.role ??
    (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups) ??
    "teacher";

  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { leaveId, studentId, status } = body as { leaveId?: string; studentId?: string; status?: LeaveRow["status"] };
  if (!leaveId || !status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "leaveId + status required" }, { status: 400 });
  }

  try {
    let actualStudentId = studentId;
    if (!actualStudentId) {
      const scanResp = await scanItems({ TableName: LEAVES_TABLE });
      const items = ((scanResp && scanResp.Items) || []) as LeaveRow[];
      const found = items.find((it) => it.leaveId === leaveId);
      if (!found) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      actualStudentId = found.studentId;
    }

    const updateParams = {
      TableName: LEAVES_TABLE,
      Key: { leaveId, studentId: actualStudentId },
      UpdateExpression: "SET #st = :s, reviewedBy = :r",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":s": status,
        ":r": String(jwt.sub ?? jwt.email ?? jwt.userId ?? ""),
      },
      ReturnValues: "ALL_NEW",
    };

    const updateResult = await updateItem(updateParams);
    return NextResponse.json({ ok: true, leave: (updateResult as any).Attributes || { leaveId, status } });
  } catch (err: any) {
    console.error("PATCH leaves error", err);
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
}
