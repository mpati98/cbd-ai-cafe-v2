import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { generateTableCode } from "@/lib/table-code";
import { tableUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/tables/:id — sửa tên / bật-tắt hoạt động / sinh mã QR mới (mã
// cũ sẽ không còn dùng được — hữu ích khi nghi ngờ QR bị lộ/dán nhầm bàn).
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "tables");
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
  return ok(table);
});

// DELETE /api/tables/:id — xoá bàn. Đơn cũ đã gắn bàn này sẽ tự về
// `tableId = null` (onDelete: SetNull), không bị xoá theo, vẫn giữ tên bàn
// qua `tableLabel` đã snapshot lúc đặt.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "tables");
  const { id } = await params;
  const db = requireDb();
  await db.table.delete({ where: { id } });
  return noContent();
});
