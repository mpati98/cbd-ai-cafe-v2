import { NextRequest } from "next/server";
import { ApiError, created, ok, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { tableCodeFromLabel } from "@/lib/table-code";
import { tableCreateSchema } from "@/lib/schemas";
import { enqueueTableSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

// GET /api/tables — danh sách bàn tại quán này (dùng bởi /ops/tables).
export const GET = withErrorHandling(async () => {
  const db = requireDb();
  const tables = await db.table.findMany({ orderBy: { createdAt: "asc" } });
  return ok(tables);
});

// POST /api/tables — tạo bàn mới. Mã (slug) sinh từ tên: "Bàn 01" → /order/t/ban-01.
// Hai tên cho ra cùng slug (vd "Bàn 1" và "ban 1") thì từ chối, không tự thêm hậu tố
// để link luôn đọc ra đúng tên bàn.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await parseBody(req, tableCreateSchema);
  const db = requireDb();
  const code = tableCodeFromLabel(body.label);

  if (await db.table.findUnique({ where: { code }, select: { id: true } })) {
    throw new ApiError(409, `Đã có bàn dùng link /order/t/${code} — hãy đặt tên khác.`);
  }
  const table = await db.table.create({ data: { label: body.label, code } });

  void enqueueTableSync({
    localId: table.id,
    code: table.code,
    label: table.label,
    isActive: table.isActive,
    updatedAt: table.updatedAt.toISOString(),
  }).catch(() => {});

  return created(table);
});
