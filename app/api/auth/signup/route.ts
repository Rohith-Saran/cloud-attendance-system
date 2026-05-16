import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { hashPassword } from "../../../../utils/hash";
import { userIdFromEmail } from "../../../../utils/userId";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function saveLocalUser(user: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    let users: any[] = [];
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      users = raw ? JSON.parse(raw) : [];
    }
    if (users.find((u) => u.email === user.email)) {
      return { status: 409, message: "User already exists" };
    }
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return { status: 201, user };
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}

function usersTable() {
  return process.env.DYNAMODB_USERS_TABLE || process.env.DYNAMODB_TABLE_USERS;
}

async function saveToDynamo(user: any) {
  const table = usersTable();
  if (!table) return { enabled: false };
  const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" });
  const doc = DynamoDBDocumentClient.from(client);
  try {
    // check existing
    const get = await doc.send(new GetCommand({ TableName: table, Key: { userId: user.userId } }));
    if (get.Item) return { status: 409, message: "User already exists" };
    await doc.send(
      new PutCommand({
        TableName: table,
        Item: user,
      })
    );
    return { status: 201, user };
  } catch (err: any) {
    return { status: 500, message: err.message };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role, classId } = body;
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { salt, hash } = hashPassword(password);
    const userId = userIdFromEmail(email);
    const user = {
      userId,
      email,
      name,
      role: role ?? "student",
      classId: classId ?? (role === "student" ? "class-a" : undefined),
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
    };

    // Try DynamoDB if configured
    if (usersTable()) {
      const res = await saveToDynamo(user);
      if (res.enabled === false) {
        // fallback to local
      } else {
        return NextResponse.json({ ok: true, user }, { status: res.status ?? 201 });
      }
    }

    // Local fallback
    const saved = await saveLocalUser(user);
    if (saved.status && saved.status >= 400) {
      return NextResponse.json({ error: saved.message }, { status: saved.status });
    }

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
