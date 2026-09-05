import { requireDb } from "@/lib/api";

/** Tra bàn theo mã QR — Table được tạo/quản lý ngay tại pos-local (không phải
 * cache), nên đọc thẳng, không cần fallback tĩnh (bàn là dữ liệu vận hành
 * thực tế, không có ý nghĩa gì để "giả" khi DB local lỗi). */
export async function getTableByCode(code: string) {
  const db = requireDb();
  try {
    const table = await db.table.findUnique({ where: { code } });
    if (!table || !table.isActive) return null;
    return table;
  } catch (err) {
    console.warn("[table-lookup] Không tra được bàn:", err instanceof Error ? err.message : err);
    return null;
  }
}
