import { NextRequest } from "next/server";
import { created, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { generateTableCode } from "@/lib/table-code";
import { tableCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/tables — danh sách bàn. Yêu cầu đăng nhập + đúng quyền.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "tables");
  const db = requireDb();
  const tables = await db.table.findMany({ orderBy: { createdAt: "asc" } });
  return ok(tables);
});

// POST /api/tables — tạo bàn mới, tự sinh mã ngẫu nhiên (thử lại nếu trùng
// — xác suất trùng gần như bằng 0 với 6 ký tự nhưng vẫn phòng hờ).
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "tables");
  const body = await parseBody(req, tableCreateSchema);
  const db = requireDb();

  let table = null;
  for (let attempt = 0; attempt < 5 && !table; attempt++) {
    const code = generateTableCode();
    try {
      table = await db.table.create({ data: { label: body.label, code } });
    } catch (err) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
        continue; // trùng mã, thử lại với mã mới
      }
      throw err;
    }
  }
  if (!table) throw new Error("Không tạo được mã bàn duy nhất sau nhiều lần thử.");

  return created(table);
});
