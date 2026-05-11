import ipRangeCheck from "ip-range-check";

/**
 * Extracts client IP from a Request's headers (`x-forwarded-for` or `x-real-ip`).
 */
export function getIPFromRequest(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  if (!xf) return null;
  const ips = xf.split(",").map((s) => s.trim()).filter(Boolean);
  return ips.length > 0 ? ips[0] : null;
}

/**
 * Returns true if `ip` is within the provided `rangeSpec`.
 * `rangeSpec` may be a single CIDR ("10.0.0.0/8"), a comma-separated string,
 * or an array of CIDRs/IPs.
 */
export function isIPInRange(ip: string | null, rangeSpec?: string | string[]): boolean {
  if (!ip || !rangeSpec) return false;
  const ranges = Array.isArray(rangeSpec)
    ? rangeSpec
    : String(rangeSpec)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  try {
    return ipRangeCheck(ip, ranges as any);
  } catch (err) {
    return false;
  }
}

/**
 * Convenience helper used in API routes: reads IP from request and checks
 * against `COLLEGE_IP_RANGE` env or an optional override.
 */
export function isRequestFromCampus(req: Request, rangeOverride?: string | string[]) {
  const ip = getIPFromRequest(req);
  const ranges = rangeOverride || process.env.COLLEGE_IP_RANGE;
  return isIPInRange(ip, ranges as any);
}

export default {
  getIPFromRequest,
  isIPInRange,
  isRequestFromCampus,
};
