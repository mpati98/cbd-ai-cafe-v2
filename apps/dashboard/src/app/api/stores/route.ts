import { NextRequest } from "next/server";
import { created, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { storeCreateSchema } from "@/lib/schemas";
import { generateStoreApiKey, hashStoreApiKey } from "@/lib/store-auth";

export const dynamic = "force-dynamic";

const STORE_SELECT = {
  id: true,
  name: true,
  isActive: true,
  lastHealthPingAt: true,
  lastPendingSyncCount: true,
  createdAt: true,
} as const;

// GET /api/stores — danh sách quán.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "stores");
  const db = requireDb();
  const stores = await db.store.findMany({ orderBy: { createdAt: "asc" }, select: STORE_SELECT });
  return ok(stores);
});

// POST /api/stores — provision 1 quán mới, trả về apiKey THẬT (chỉ 1 lần —
// sau đó chỉ lưu bản băm, không xem lại được). Dán apiKey này vào
// STORE_API_KEY trong .env của apps/pos-local tại quán đó.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "stores");
  const { name } = await parseBody(req, storeCreateSchema);
  const db = requireDb();

  const apiKey = generateStoreApiKey();
  const store = await db.store.create({
    data: { name, apiKeyHash: hashStoreApiKey(apiKey) },
    select: STORE_SELECT,
  });

  return created({ ...store, apiKey });
});
