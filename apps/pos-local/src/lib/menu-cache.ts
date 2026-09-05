import { requireDb } from "@/lib/api";
import { fallbackMenuItems } from "@cbd/shared-types";

export type MenuItemForOrder = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceVnd: number;
  isBestSeller: boolean;
  order: number;
  imageId: string | null;
  tags: string[];
};

/**
 * Đọc thực đơn từ MenuItemCache (đồng bộ xuống từ dashboard qua
 * GET /api/sync/config — xem lib/sync.ts). Nếu cache rỗng (mới cài đặt, chưa
 * pull lần nào / mất mạng lúc khởi động), dùng tạm danh sách tĩnh để trang
 * order vẫn hiển thị được — giống hệt tinh thần fallback-data.ts phía cloud.
 */
export async function getMenuItems(): Promise<MenuItemForOrder[]> {
  const db = requireDb();
  try {
    const rows = await db.menuItemCache.findMany({ orderBy: { order: "asc" } });
    if (rows.length) {
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        priceVnd: r.priceVnd,
        isBestSeller: r.isBestSeller,
        order: r.order,
        imageId: r.imageId,
        tags: JSON.parse(r.tagsJson) as string[],
      }));
    }
  } catch (err) {
    console.warn("[menu-cache] Không đọc được MenuItemCache:", err instanceof Error ? err.message : err);
  }
  return fallbackMenuItems;
}
