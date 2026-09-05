import { NextRequest } from "next/server";
import { ok, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { requireStore } from "@/lib/store-auth";
import { syncPushPayloadSchema, type SyncPushResponse } from "@cbd/shared-types";
import { recomputeTopicScores, recordTopicUsage } from "@/lib/knowledge-scoring";

export const dynamic = "force-dynamic";

// POST /api/sync/push — pos-local đẩy lên: đơn hàng/bàn đã tạo/đổi trạng thái
// cục bộ, và số lượt hỏi knowledge chưa báo cáo. Idempotent theo
// (storeId, localId) — retry an toàn nếu lần trước bị rớt mạng giữa chừng.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const store = await requireStore(req);
  const { orders = [], tables = [], knowledgeAskDeltas = [] } = await parseBody(req, syncPushPayloadSchema);
  const db = requireDb();

  const acceptedOrderLocalIds: string[] = [];
  for (const order of orders) {
    await db.order.upsert({
      where: { storeId_localId: { storeId: store.id, localId: order.localId } },
      create: {
        storeId: store.id,
        localId: order.localId,
        customerName: order.customerName,
        customerNote: order.customerNote,
        adminNote: order.adminNote,
        totalVnd: order.totalVnd,
        isReceived: order.isReceived,
        isPreparing: order.isPreparing,
        isPaid: order.isPaid,
        isDelivered: order.isDelivered,
        isCancelled: order.isCancelled,
        tableLabel: order.tableLabel,
        createdAt: new Date(order.createdAt),
        items: {
          create: order.items.map((it) => ({
            localId: it.localId,
            menuItemId: it.menuItemId,
            nameSnapshot: it.nameSnapshot,
            priceVndSnapshot: it.priceVndSnapshot,
            quantity: it.quantity,
          })),
        },
      },
      update: {
        adminNote: order.adminNote,
        isReceived: order.isReceived,
        isPreparing: order.isPreparing,
        isPaid: order.isPaid,
        isDelivered: order.isDelivered,
        isCancelled: order.isCancelled,
      },
    });
    acceptedOrderLocalIds.push(order.localId);
  }

  const acceptedTableLocalIds: string[] = [];
  for (const table of tables) {
    await db.table.upsert({
      where: { storeId_localId: { storeId: store.id, localId: table.localId } },
      create: {
        storeId: store.id,
        localId: table.localId,
        code: table.code,
        label: table.label,
        isActive: table.isActive,
      },
      update: {
        code: table.code,
        label: table.label,
        isActive: table.isActive,
      },
    });
    acceptedTableLocalIds.push(table.localId);
  }

  if (knowledgeAskDeltas.length > 0) {
    await Promise.allSettled(knowledgeAskDeltas.map((d) => recordTopicUsage(d.topicId, d.delta)));
    await recomputeTopicScores();
  }

  const response: SyncPushResponse = { ok: true, acceptedOrderLocalIds, acceptedTableLocalIds };
  return ok(response);
});
