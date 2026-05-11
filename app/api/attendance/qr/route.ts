import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { generateQRPayload } from "~/lib/qr";
import { putItem } from "~/lib/aws/dynamodb";

const SESSIONS_TABLE = process.env.DYNAMODB_SESSIONS_TABLE || "Sessions";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = token.role ?? (Array.isArray((token as any).groups) ? (token as any).groups[0] : (token as any).groups);
  if (role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const classId = body.classId;
  const subject = body.subject || "";

  // Generate a new sessionId if not provided
  const sessionId = body.sessionId || `${classId || "class"}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Create QR payload (token tied to current 30s window)
  const payload = generateQRPayload(sessionId);

  // Persist session metadata to Sessions table with TTL (1 hour)
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const sessionItem = {
    sessionId,
    classId,
    teacherId: token.sub || token.email || "",
    subject,
    createdAt: new Date().toISOString(),
    expiresAt, // DynamoDB TTL (epoch seconds)
    usedTokens: [],
  };

  try {
    await putItem({ TableName: SESSIONS_TABLE, Item: sessionItem });
  } catch (err) {
    console.error("Failed to create session item", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({ sessionId, token: payload.token, window: payload.window });
}

export async function GET(req: NextRequest) {
  // Optionally allow GET to preview a token for a sessionId query param (teacher-only)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = token.role ?? (Array.isArray((token as any).groups) ? (token as any).groups[0] : (token as any).groups);
  if (role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const payload = generateQRPayload(sessionId);
  return NextResponse.json({ sessionId, token: payload.token, window: payload.window });
}
