import { NextRequest } from "next/server";
import { z } from "zod";
import { created, noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { generateStoreApiKey, hashStoreApiKey } from "@/lib/store-auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const storeUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  regenerateApiKey: z.boolean().optional(),
});

const STORE_SELECT = {
  id: true,
  name: true,
  isActive: true,
  lastHealthPingAt: true,
  lastPendingSyncCount: true,
  createdAt: true,
} as const;

// PATCH /api/stores/:id — đổi tên / khoá-mở quán / cấp lại apiKey (nếu bị lộ).
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "stores");
  const { id } = await params;
  const { name, isActive, regenerateApiKey } = await parseBody(req, storeUpdateSchema);
  const db = requireDb();

  const data: { name?: string; isActive?: boolean; apiKeyHash?: string } = {};
  if (name !== undefined) data.name = name;
  if (isActive !== undefined) data.isActive = isActive;

  let apiKey: string | undefined;
  if (regenerateApiKey) {
    apiKey = generateStoreApiKey();
    data.apiKeyHash = hashStoreApiKey(apiKey);
  }

  const store = await db.store.update({ where: { id }, data, select: STORE_SELECT });
  if (apiKey) return created({ ...store, apiKey });
  return ok(store);
});

// DELETE /api/stores/:id — xoá quán (và toàn bộ Order/Table đã đồng bộ của quán đó, xem onDelete: Cascade).
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "stores");
  const { id } = await params;
  const db = requireDb();
  await db.store.delete({ where: { id } });
  return noContent();
});
