/**
 * Next.js instrumentation hook (register() chạy đúng 1 lần lúc server khởi
 * động, kể cả `next dev`/`next start`/trong Docker) — nơi khởi động các
 * worker nền của pos-local: kéo config mới, đẩy outbox, báo health. Không
 * dùng cron ngoài vì đây là 1 process Node chạy liên tục (không phải
 * serverless) — setInterval là đủ, cùng tinh thần với lib/rate-limit.ts
 * (state per-process đã được chấp nhận trong dự án này).
 */

const CONFIG_PULL_INTERVAL_MS = 5 * 60 * 1000; // 5 phút
const OUTBOX_DRAIN_INTERVAL_MS = 60 * 1000; // 1 phút
const HEALTH_PING_INTERVAL_MS = 2 * 60 * 1000; // 2 phút

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { pullConfig, drainOutbox, pingHealth } = await import("@/lib/sync");

  // Lần đầu boot: kéo config ngay (cache rỗng thì order-chat/menu sẽ dùng
  // fallback tĩnh cho tới khi có mạng — xem lib/menu-cache.ts).
  void pullConfig();

  setInterval(() => void pullConfig(), CONFIG_PULL_INTERVAL_MS);
  setInterval(() => void drainOutbox(), OUTBOX_DRAIN_INTERVAL_MS);
  setInterval(() => void pingHealth(), HEALTH_PING_INTERVAL_MS);
}
