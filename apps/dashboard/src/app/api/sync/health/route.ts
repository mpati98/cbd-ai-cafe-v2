import { NextRequest } from "next/server";
import { noContent, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { requireStore } from "@/lib/store-auth";
import { healthPingPayloadSchema } from "@cbd/shared-types";

export const dynamic = "force-dynamic";

// POST /api/sync/health — pos-local báo cáo tình trạng định kỳ, hiển thị ở
// tab "Quán & đồng bộ" (chấm trạng thái + số item đang chờ đồng bộ).
export const POST = withErrorHandling(async (req: NextRequest) => {
  const store = await requireStore(req);
  const { pendingSyncCount } = await parseBody(req, healthPingPayloadSchema);
  const db = requireDb();

  await db.store.update({
    where: { id: store.id },
    data: { lastHealthPingAt: new Date(), lastPendingSyncCount: pendingSyncCount },
  });

  return noContent();
});
