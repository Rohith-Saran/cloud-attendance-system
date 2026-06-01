import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { hashPassword } from "../../../../utils/hash";
import { userIdFromEmail } from "../../../../utils/userId";
import { putItem } from "~/lib/aws/dynamodb";
import fs from "fs";
import path from "path";

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || process.env.DYNAMODB_TABLE_USERS || "Users";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

export async function POST(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role =
    jwt.role ??
    (Array.isArray((jwt as any).groups) ? (jwt as any).groups[0] : (jwt as any).groups) ??
    "student";

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { students } = body as { students?: any[] };

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "Invalid or empty student list" }, { status: 400 });
    }

    const { salt, hash } = hashPassword("password123");
    const createdUsers: any[] = [];

    // Load local file if writing locally or as fallback
    let localUsers: any[] = [];
    const localEnabled = !process.env.DYNAMODB_USERS_TABLE;

    if (localEnabled || true) {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, "utf-8");
        localUsers = raw ? JSON.parse(raw) : [];
      }
    }

    for (const s of students) {
      const email = String(s.email || "").trim();
      const name = String(s.name || "").trim();
      const classId = String(s.classId || "class-a").trim();

      if (!email || !name) continue;

      const userId = userIdFromEmail(email);

      const user = {
        userId,
        email,
        name,
        role: "student",
        classId,
        passwordHash: hash,
        salt,
        createdAt: new Date().toISOString(),
      };

      try {
        if (process.env.DYNAMODB_USERS_TABLE) {
          await putItem({ TableName: USERS_TABLE, Item: user });
        }
      } catch (e) {
        console.error("DynamoDB put student error, falling back to local storage:", e);
      }

      // Always write to local storage as well for instant synchronization
      if (!localUsers.some((u) => u.email === email)) {
        localUsers.push(user);
      }
      createdUsers.push(user);
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(localUsers, null, 2));

    return NextResponse.json({ ok: true, count: createdUsers.length });
  } catch (err: any) {
    console.error("Bulk students import error:", err);
    return NextResponse.json({ error: err.message || "Failed to import students" }, { status: 500 });
  }
}
