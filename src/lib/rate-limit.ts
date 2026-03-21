import type { NextRequest } from "next/server";

const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;
const requestLog = new Map<string, number[]>();

export function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    forwardedIp ??
    "unknown"
  );
}

export function consumeSubmissionQuota(key: string) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const recentHits = (requestLog.get(key) ?? []).filter(
    (timestamp) => timestamp >= windowStart,
  );

  if (recentHits.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestHit = recentHits[0] ?? now;
    const retryAfterSeconds = Math.max(
      Math.ceil((oldestHit + WINDOW_MS - now) / 1000),
      1,
    );

    requestLog.set(key, recentHits);

    return {
      allowed: false,
      retryAfterSeconds,
    };
  }

  recentHits.push(now);
  requestLog.set(key, recentHits);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}
