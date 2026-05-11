import crypto from "crypto";

const WINDOW_MS = 30_000; // 30 seconds per rotating window

function getWindow(atTimeMs?: number) {
  return Math.floor((atTimeMs ?? Date.now()) / WINDOW_MS);
}

export function generateQRToken(sessionId: string, atTimeMs?: number): string {
  const window = getWindow(atTimeMs);
  const msg = `${sessionId}${window}`;
  const secret = process.env.QR_SECRET || "";
  const h = crypto.createHmac("sha256", secret).update(msg).digest("hex");
  return h;
}

export function generateQRPayload(sessionId: string) {
  const token = generateQRToken(sessionId);
  return { sessionId, token, window: getWindow() };
}

/**
 * Validate token strictly against the current 30s window.
 * Returns true only if it matches the HMAC for the current window.
 */
export function validateQRToken(token: string, sessionId: string): boolean {
  if (!token || !sessionId) return false;
  try {
    const expected = generateQRToken(sessionId);
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(expected, "hex");
    if (!a.length || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default {
  generateQRToken,
  generateQRPayload,
  validateQRToken,
};
