import { z } from "zod";
import type { MenuItemDTO, KnowledgeTopicDTO, SystemPromptDTO, LocationDTO } from "./domain";

/**
 * Hợp đồng dữ liệu giữa `apps/pos-local` (chạy tại quán, SQLite) và
 * `apps/dashboard` (cloud, Postgres/Neon) — xem packages/database cho 2
 * schema Prisma tương ứng. pos-local là bên gọi (client) cho cả 3 endpoint:
 *
 *  - GET  /api/sync/config  -> ConfigSyncResponse   (kéo xuống: menu/knowledge/system prompt)
 *  - POST /api/sync/push    -> SyncPushPayload in, SyncPushResponse out (đẩy lên: order/table/ask-delta)
 *  - POST /api/sync/health  -> HealthPingPayload in (báo cáo tình trạng quán)
 *
 * Tất cả 3 endpoint yêu cầu header `Authorization: Bearer <Store.apiKey>`.
 */

export type ConfigSyncResponse = {
  configVersion: number;
  menu: MenuItemDTO[];
  knowledgeTopics: KnowledgeTopicDTO[];
  systemPrompt: SystemPromptDTO;
  /// Chỉ location APPROVED thuộc đúng storeId của quán gọi API (xác thực qua
  /// Store.apiKey, xem requireStore()) — khác menu/knowledgeTopics vốn là
  /// catalog dùng chung mọi quán.
  locations: LocationDTO[];
};

export const orderItemSyncSchema = z.object({
  localId: z.string().min(1),
  menuItemId: z.string().nullable(),
  nameSnapshot: z.string().min(1),
  priceVndSnapshot: z.number().int().nonnegative(),
  quantity: z.number().int().min(1),
});
export type OrderItemSyncDTO = z.infer<typeof orderItemSyncSchema>;

export const orderSyncSchema = z.object({
  localId: z.string().min(1),
  customerName: z.string().nullable(),
  customerNote: z.string().nullable(),
  adminNote: z.string().nullable(),
  totalVnd: z.number().int().nonnegative(),
  isReceived: z.boolean(),
  isPreparing: z.boolean(),
  isPaid: z.boolean(),
  isDelivered: z.boolean(),
  isCancelled: z.boolean(),
  tableLocalId: z.string().nullable(),
  tableLabel: z.string().nullable(),
  items: z.array(orderItemSyncSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OrderSyncDTO = z.infer<typeof orderSyncSchema>;

export const tableSyncSchema = z.object({
  localId: z.string().min(1),
  code: z.string().min(1),
  label: z.string().min(1),
  isActive: z.boolean(),
  updatedAt: z.string(),
});
export type TableSyncDTO = z.infer<typeof tableSyncSchema>;

export const knowledgeAskDeltaSchema = z.object({
  topicId: z.string().min(1),
  delta: z.number().int().min(1),
});
export type KnowledgeAskDeltaDTO = z.infer<typeof knowledgeAskDeltaSchema>;

export const syncPushPayloadSchema = z.object({
  orders: z.array(orderSyncSchema).max(200).default([]),
  tables: z.array(tableSyncSchema).max(200).default([]),
  knowledgeAskDeltas: z.array(knowledgeAskDeltaSchema).max(500).default([]),
});
export type SyncPushPayload = z.infer<typeof syncPushPayloadSchema>;

export type SyncPushResponse = {
  ok: true;
  acceptedOrderLocalIds: string[];
  acceptedTableLocalIds: string[];
};

export const healthPingPayloadSchema = z.object({
  timestamp: z.string(),
  pendingSyncCount: z.number().int().nonnegative(),
  appVersion: z.string().max(40).optional(),
});
export type HealthPingPayload = z.infer<typeof healthPingPayloadSchema>;
