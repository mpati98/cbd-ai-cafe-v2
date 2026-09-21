import { requireDb } from "@/lib/api";
import { slugifyTableLabel } from "@/lib/table-code";
import { enqueueTableSync } from "@/lib/sync";

/** Tra bàn theo mã QR — Table được tạo/quản lý ngay tại pos-local (không phải
 * cache), nên đọc thẳng, không cần fallback tĩnh (bàn là dữ liệu vận hành
 * thực tế, không có ý nghĩa gì để "giả" khi DB local lỗi). */
export async function getTableByCode(code: string) {
  const db = requireDb();
  try {
    const table = await db.table.findUnique({ where: { code: code.toLowerCase() } });
    if (!table || !table.isActive) return null;
    return table;
  } catch (err) {
    console.warn("[table-lookup] Không tra được bàn:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Chạy lúc khởi động: bàn tạo từ bản cũ có mã ngẫu nhiên (vd "k7m2xp") được đổi
 * sang slug theo tên ("ban-01") để link luôn khớp tên. Idempotent — bàn đã đúng
 * slug thì bỏ qua; slug trùng với bàn khác thì giữ mã cũ (không phá link).
 * Lưu ý: QR đã in với mã cũ sẽ hết hiệu lực sau lần chạy đầu tiên.
 */
export async function migrateTableCodesToSlugs(): Promise<void> {
  const db = requireDb();
  const tables = await db.table.findMany({ orderBy: { createdAt: "asc" } });
  const taken = new Set(tables.map((t) => t.code));
  for (const t of tables) {
    const slug = slugifyTableLabel(t.label);
    if (!slug || slug === t.code || taken.has(slug)) continue;
    const updated = await db.table.update({ where: { id: t.id }, data: { code: slug } });
    taken.delete(t.code);
    taken.add(slug);
    console.info(`[table-lookup] Đổi mã bàn "${t.label}": ${t.code} → ${slug}`);
    await enqueueTableSync({
      localId: updated.id,
      code: updated.code,
      label: updated.label,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    }).catch(() => {});
  }
}
