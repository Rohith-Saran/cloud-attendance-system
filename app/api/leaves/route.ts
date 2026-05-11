import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { randomUUID } from "crypto";

type LeaveRow = {
  leaveId: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  createdAt?: string;
};

/** In-memory store until Leaves DynamoDB wiring is deployed */
const MEMORY: LeaveRow[] = [];

export async function GET(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role =
    jwt.role ??
    (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups);

  const id = String(jwt.sub ?? jwt.email ?? "");

  if (role === "teacher" || role === "admin") {
    return NextResponse.json({ leaves: MEMORY });
  }

  return NextResponse.json({ leaves: MEMORY.filter((l) => l.studentId === id) });
}

export async function POST(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role =
    jwt.role ??
    (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups);

  const body = await req.json().catch(() => ({}));

  if (role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = String(jwt.sub ?? jwt.email ?? "");

  const row: LeaveRow = {
    leaveId: randomUUID(),
    studentId: id,
    fromDate: body.fromDate,
    toDate: body.toDate,
    reason: body.reason || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  MEMORY.unshift(row);
  return NextResponse.json({ ok: true, leave: row });
}

export async function PATCH(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role =
    jwt.role ??
    (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups);
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { leaveId, status } = body as { leaveId?: string; status?: LeaveRow["status"] };
  if (!leaveId || !status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "leaveId + status required" }, { status: 400 });
  }

  const row = MEMORY.find((l) => l.leaveId === leaveId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  row.status = status;
  row.reviewedBy = String(jwt.sub ?? jwt.email ?? "");

  return NextResponse.json({ ok: true, leave: row });
}
