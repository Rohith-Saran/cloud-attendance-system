import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { validateQRToken } from "~/lib/qr";
import { isRequestFromCampus, getIPFromRequest } from "~/lib/ipcheck";
import { getItem, putItem, updateItem } from "~/lib/aws/dynamodb";

const ATTENDANCE_TABLE = process.env.DYNAMODB_ATTENDANCE_TABLE || "Attendance";
const SESSIONS_TABLE = process.env.DYNAMODB_SESSIONS_TABLE || "Sessions";

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sessionId, token } = body;

  if (!sessionId || !token) return NextResponse.json({ error: "sessionId and token required" }, { status: 400 });

  // Authenticate user (student)
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = jwt.role ?? (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups) ?? "student";
  if (role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const studentId = jwt.sub || jwt.email || jwt.userId;

  // Validate QR token (30s rotating window)
  let valid = false;
  try {
    valid = validateQRToken(token, sessionId);
  } catch (err) {
    console.error("QR validation error", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  if (!valid) return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });

  // Verify session exists and token not used
  let sessionRes: any;
  try {
    const resp = await getItem({ TableName: SESSIONS_TABLE, Key: { sessionId } });
    sessionRes = (resp && (resp.Item || resp)) || null;
  } catch (err) {
    console.error("Failed to read session", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!sessionRes) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const usedTokens: string[] = sessionRes.usedTokens || [];
  if (usedTokens.includes(token)) return NextResponse.json({ error: "Token already used" }, { status: 403 });

  // Verify request originates from campus network
  const onCampus = isRequestFromCampus(req as unknown as Request);
  const clientIP = getIPFromRequest(req as unknown as Request) || "";
  if (!onCampus) return NextResponse.json({ error: "Off-campus" }, { status: 403 });

  // Mark attendance record
  const date = todayDate();
  const sortKey = `${date}#${studentId}`;

  const classId = sessionRes.classId || body.classId || jwt.classId || "unknown-class";
  const attendanceItem = {
    classId,
    sortKey,
    datestudentId: sortKey,
    studentId,
    date,
    status: "P",
    markedAt: new Date().toISOString(),
    markedBy: studentId,
    method: "qr-scan",
    sessionToken: token,
    methodDetail: { ip: clientIP },
  };

  try {
    await putItem({ TableName: ATTENDANCE_TABLE, Item: attendanceItem });
  } catch (err) {
    console.error("Failed to write attendance", err);
    return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
  }

  // Append token to session.usedTokens with UpdateExpression
  try {
    const updateParams = {
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
      UpdateExpression: "SET usedTokens = list_append(if_not_exists(usedTokens, :empty), :tok)",
      ExpressionAttributeValues: {
        ":tok": [token],
        ":empty": [],
      },
    } as any;
    await updateItem(updateParams);
  } catch (err) {
    console.error("Failed to update session usedTokens", err);
    // Not fatal — attendance recorded; return success but log the issue
  }

  return NextResponse.json({ ok: true, marked: true });
}
