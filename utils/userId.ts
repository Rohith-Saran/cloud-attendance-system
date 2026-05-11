import crypto from "crypto";

/** Deterministic id from email for DynamoDB partition key. */
export function userIdFromEmail(email: string): string {
  return crypto.createHash("sha256").update(String(email).toLowerCase().trim()).digest("hex").slice(0, 32);
}
