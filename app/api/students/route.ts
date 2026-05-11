import { NextRequest, NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getToken } from "next-auth/jwt";
import { ddbClient } from "~/lib/aws/dynamodb";

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || process.env.DYNAMODB_TABLE_USERS || "";

export async function GET(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") || "";

  if (!jwt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!USERS_TABLE) {
    const sample = Array.from({ length: 12 }).map((_, i) => ({
      userId: `s${1000 + i}`,
      name: `Student ${i + 1}`,
      email: `student${i + 1}@example.com`,
      classId: classId || "class-a",
      role: "student",
    }));
    const filtered = classId ? sample.filter((s) => s.classId === classId) : sample;
    return NextResponse.json({ students: filtered });
  }

  try {
    let items: Record<string, unknown>[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;

    const filterSegments: string[] = ["#role = :student"];
    const exprNames: Record<string, string> = { "#role": "role" };
    const exprValues: Record<string, unknown> = { ":student": "student" };

    if (classId) {
      filterSegments.push("classId = :c");
      exprValues[":c"] = classId;
    }

    do {
      const resp = await ddbClient.send(
        new ScanCommand({
          TableName: USERS_TABLE,
          FilterExpression: filterSegments.join(" AND "),
          ExpressionAttributeNames: exprNames,
          ExpressionAttributeValues: exprValues,
          ExclusiveStartKey,
        }),
      );
      items = items.concat(resp.Items || []);
      ExclusiveStartKey = resp.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return NextResponse.json({ students: items });
  } catch (err) {
    console.error("students route error", err);
    return NextResponse.json({ students: [] }, { status: 500 });
  }
}
