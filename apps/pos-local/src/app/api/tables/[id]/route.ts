import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { generateTableCode } from "@/lib/table-code";
import { tableUpdateSchema } from "@/lib/schemas";
import { enqueueTableSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function syncPayload(table: { id: string; code: string; label: string; isActive: boolean; updatedAt: Date }) {
  return { localId: table.id, code: table.code, label: table.label, isActive: table.isActive, updatedAt: table.updatedAt.toISOString() };
}

// PATCH /api/tables/:id — sửa tên / bật-tắt hoạt động / sinh mã QR mới.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const body = await parseBody(req, tableUpdateSchema);
  const db = requireDb();

  const data: Record<string, unknown> = {};
  if (body.label !== undefined) data.label = body.label;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  if (body.regenerateCode) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateTableCode();
      try {
        const table = await db.table.update({ where: { id }, data: { ...data, code } });
        void enqueueTableSync(syncPayload(table)).catch(() => {});
        return ok(table);
      } catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
          continue;
        }
        throw err;
      }
    }
    throw new ApiError(500, "Không sinh được mã mới, thử lại.");
  }

  const table = await db.table.update({ where: { id }, data });
  void enqueueTableSync(syncPayload(table)).catch(() => {});
  return ok(table);
});

// DELETE /api/tables/:id — xoá bàn (đơn cũ tự về tableId=null, giữ tableLabel snapshot).
export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const db = requireDb();
  await db.table.delete({ where: { id } });
  return noContent();
});
