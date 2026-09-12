/**
 * lib/sync.ts (apps/pos-local)
 * -----------------------------------------------------------------------
 * Client cho 3 endpoint /api/sync/* của apps/dashboard (xem
 * packages/shared-types/src/sync.ts cho hợp đồng dữ liệu):
 *
 *  - pullConfig()  : GET  /api/sync/config  -> ghi đè MenuItemCache/
 *                    KnowledgeTopicCache/SystemPromptCache, bump configVersion.
 *  - drainOutbox() : quét SyncOutbox (pending/failed) + KnowledgeTopicCache có
 *                    pendingAskDelta>0 -> POST /api/sync/push theo lô.
 *  - pingHealth()  : POST /api/sync/health định kỳ.
 *
 * Cả 3 đều best-effort — lỗi mạng/DASHBOARD_URL chưa cấu hình chỉ log, không
 * throw ra ngoài (pos-local phải chạy được hoàn toàn độc lập khi mất mạng,
 * chỉ có mỗi việc đồng bộ bị trễ lại, không có gì khác hỏng theo).
 * -----------------------------------------------------------------------
 */

import { requireDb } from "@/lib/api";
import type { ConfigSyncResponse, SyncPushPayload, OrderSyncDTO, TableSyncDTO } from "@cbd/shared-types";

const APP_VERSION = "0.1.0";
const MAX_ATTEMPTS_BEFORE_BACKOFF_LOG = 5;

function dashboardUrl(): string | null {
  const url = process.env.DASHBOARD_URL;
  return url ? url.replace(/\/$/, "") : null;
}

function authHeaders(): Record<string, string> | null {
  const apiKey = process.env.STORE_API_KEY;
  if (!apiKey) return null;
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

/** Ghi 1 outbox row cho 1 đơn vừa tạo/đổi trạng thái + thử đẩy ngay (best-effort). */
export async function enqueueOrderSync(order: OrderSyncDTO): Promise<void> {
  const db = requireDb();
  await db.syncOutbox.create({
    data: { entityType: "order", entityId: order.localId, payloadJson: JSON.stringify(order) },
  });
  void drainOutbox().catch(() => {});
}

/** Ghi 1 outbox row cho 1 bàn vừa tạo/đổi trạng thái + thử đẩy ngay (best-effort). */
export async function enqueueTableSync(table: TableSyncDTO): Promise<void> {
  const db = requireDb();
  await db.syncOutbox.create({
    data: { entityType: "table", entityId: table.localId, payloadJson: JSON.stringify(table) },
  });
  void drainOutbox().catch(() => {});
}

export async function pendingSyncCount(): Promise<number> {
  const db = requireDb();
  return db.syncOutbox.count({ where: { status: { in: ["pending", "failed"] } } });
}

/** Quét outbox + ask-delta chưa báo cáo, gửi 1 lô lên dashboard. */
export async function drainOutbox(): Promise<void> {
  const url = dashboardUrl();
  const headers = authHeaders();
  if (!url || !headers) return; // chưa cấu hình DASHBOARD_URL/STORE_API_KEY — bỏ qua êm

  const db = requireDb();
  const outboxRows = await db.syncOutbox.findMany({
    where: { status: { in: ["pending", "failed"] } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  const askRows = await db.knowledgeTopicCache.findMany({ where: { pendingAskDelta: { gt: 0 } } });

  if (outboxRows.length === 0 && askRows.length === 0) return;

  const orders = outboxRows.filter((r) => r.entityType === "order").map((r) => JSON.parse(r.payloadJson) as OrderSyncDTO);
  const tables = outboxRows.filter((r) => r.entityType === "table").map((r) => JSON.parse(r.payloadJson) as TableSyncDTO);
  const knowledgeAskDeltas = askRows.map((r) => ({ topicId: r.id, delta: r.pendingAskDelta }));

  const payload: SyncPushPayload = { orders, tables, knowledgeAskDeltas };

  try {
    const res = await fetch(`${url}/api/sync/push`, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rowIds = outboxRows.map((r) => r.id);
    if (rowIds.length) {
      await db.syncOutbox.updateMany({ where: { id: { in: rowIds } }, data: { status: "sent" } });
    }
    // Đánh dấu Order/Table tương ứng đã đồng bộ.
    await Promise.all([
      ...orders.map((o) => db.order.update({ where: { id: o.localId }, data: { syncStatus: "synced", syncedAt: new Date() } }).catch(() => {})),
    ]);
    if (askRows.length) {
      await db.knowledgeTopicCache.updateMany({
        where: { id: { in: askRows.map((r) => r.id) } },
        data: { pendingAskDelta: 0 },
      });
    }
  } catch (err) {
    const rowIds = outboxRows.map((r) => r.id);
    if (rowIds.length) {
      await db.syncOutbox.updateMany({
        where: { id: { in: rowIds } },
        data: { status: "failed", attempts: { increment: 1 }, lastAttemptAt: new Date(), lastError: err instanceof Error ? err.message : String(err) },
      });
      const worst = Math.max(0, ...(await db.syncOutbox.findMany({ where: { id: { in: rowIds } }, select: { attempts: true } })).map((r) => r.attempts));
      if (worst >= MAX_ATTEMPTS_BEFORE_BACKOFF_LOG) {
        console.warn(`[sync] ${rowIds.length} bản ghi đã thử đồng bộ ${worst} lần vẫn lỗi:`, err instanceof Error ? err.message : err);
      }
    }
  }
}

/** Kéo menu/knowledge/system-prompt mới nhất từ dashboard, ghi đè cache local. */
export async function pullConfig(): Promise<void> {
  const url = dashboardUrl();
  const headers = authHeaders();
  if (!url || !headers) return;

  const db = requireDb();
  try {
    const res = await fetch(`${url}/api/sync/config`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = (await res.json()) as { data: ConfigSyncResponse };

    await db.$transaction([
      ...data.menu.map((m) =>
        db.menuItemCache.upsert({
          where: { id: m.id },
          create: { id: m.id, code: m.code, name: m.name, description: m.description, priceVnd: m.priceVnd, isBestSeller: m.isBestSeller, order: m.order, imageId: m.imageId, tagsJson: JSON.stringify(m.tags) },
          update: { code: m.code, name: m.name, description: m.description, priceVnd: m.priceVnd, isBestSeller: m.isBestSeller, order: m.order, imageId: m.imageId, tagsJson: JSON.stringify(m.tags) },
        })
      ),
      ...data.knowledgeTopics.map((t) =>
        db.knowledgeTopicCache.upsert({
          where: { id: t.id },
          create: { id: t.id, categoryId: t.categoryId, categoryName: t.categoryName, title: t.title, content: t.content, keywordsJson: JSON.stringify(t.keywords), tier: t.tier, score: t.score },
          update: { categoryId: t.categoryId, categoryName: t.categoryName, title: t.title, content: t.content, keywordsJson: JSON.stringify(t.keywords), tier: t.tier, score: t.score },
        })
      ),
      db.systemPromptCache.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", version: data.systemPrompt.version, content: data.systemPrompt.content },
        update: { version: data.systemPrompt.version, content: data.systemPrompt.content },
      }),
      db.storeConfig.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", configVersion: data.configVersion },
        update: { configVersion: data.configVersion },
      }),
      // Location: THAY TOÀN BỘ (xoá hết rồi tạo lại) thay vì upsert như menu/
      // knowledge ở trên — location bị từ chối/xoá ở dashboard phải biến mất
      // khỏi gợi ý ngay lần pull tiếp theo, không chấp nhận "mồ côi" (xem
      // comment tại model LocationCache, schema.local.prisma).
      db.locationCache.deleteMany({}),
      ...data.locations.map((l) =>
        db.locationCache.create({
          data: {
            id: l.id,
            name: l.name,
            description: l.description,
            category: l.category,
            bestTimeToVisit: l.bestTimeToVisit,
            relatedLocationIdsJson: JSON.stringify(l.relatedLocationIds),
          },
        })
      ),
    ]);
  } catch (err) {
    console.warn("[sync] Không pull được config từ dashboard:", err instanceof Error ? err.message : err);
  }
}

/** Báo cáo tình trạng định kỳ (chấm trạng thái ở tab Stores của dashboard). */
export async function pingHealth(): Promise<void> {
  const url = dashboardUrl();
  const headers = authHeaders();
  if (!url || !headers) return;

  try {
    const count = await pendingSyncCount();
    await fetch(`${url}/api/sync/health`, {
      method: "POST",
      headers,
      body: JSON.stringify({ timestamp: new Date().toISOString(), pendingSyncCount: count, appVersion: APP_VERSION }),
    });
  } catch (err) {
    console.warn("[sync] Không gửi được health ping:", err instanceof Error ? err.message : err);
  }
}

/** Cache ảnh fetch-through — GET /api/images/:id local dùng hàm này. */
export async function fetchAndCacheImage(imageId: string): Promise<{ mimeType: string; data: Buffer } | null> {
  const url = dashboardUrl();
  if (!url) return null;
  try {
    const res = await fetch(`${url}/api/images/${imageId}`);
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
    const data = Buffer.from(await res.arrayBuffer());

    const db = requireDb();
    await db.imageCache.upsert({
      where: { id: imageId },
      create: { id: imageId, mimeType, data },
      update: { mimeType, data },
    });
    return { mimeType, data };
  } catch (err) {
    console.warn(`[sync] Không tải được ảnh ${imageId} từ dashboard:`, err instanceof Error ? err.message : err);
    return null;
  }
}
