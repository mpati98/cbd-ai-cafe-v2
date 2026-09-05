import { NextRequest } from "next/server";
import { created, ok, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { generateTableCode } from "@/lib/table-code";
import { tableCreateSchema } from "@/lib/schemas";
import { enqueueTableSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

// GET /api/tables — danh sách bàn tại quán này (dùng bởi /ops/tables).
export const GET = withErrorHandling(async () => {
  const db = requireDb();
  const tables = await db.table.findMany({ orderBy: { createdAt: "asc" } });
  return ok(tables);
});

// POST /api/tables — tạo bàn mới, in QR ngay tại quán (mã ngẫu nhiên, thử lại
// nếu trùng — xác suất trùng gần như bằng 0 với 6 ký tự nhưng vẫn phòng hờ).
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await parseBody(req, tableCreateSchema);
  const db = requireDb();

  let table = null;
  for (let attempt = 0; attempt < 5 && !table; attempt++) {
    const code = generateTableCode();
    try {
      table = await db.table.create({ data: { label: body.label, code } });
    } catch (err) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
        continue;
      }
      throw err;
    }
  }
  if (!table) throw new Error("Không tạo được mã bàn duy nhất sau nhiều lần thử.");

  void enqueueTableSync({
    localId: table.id,
    code: table.code,
    label: table.label,
    isActive: table.isActive,
    updatedAt: table.updatedAt.toISOString(),
  }).catch(() => {});

  return created(table);
});
