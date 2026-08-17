/**
 * Rate limit đơn giản trong bộ nhớ (đủ cho MVP — mỗi instance server có sổ
 * đếm riêng, không cần Redis). Dùng chung cho các API public không yêu cầu
 * đăng nhập (voice, order-chat) để chặn spam từ 1 IP.
 */
const buckets = new Map<string, Map<string, { count: number; windowStart: number }>>();

export function isRateLimited(bucket: string, key: string, windowMs: number, maxRequests: number): boolean {
  let hits = buckets.get(bucket);
  if (!hits) {
    hits = new Map();
    buckets.set(bucket, hits);
  }
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > maxRequests;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
