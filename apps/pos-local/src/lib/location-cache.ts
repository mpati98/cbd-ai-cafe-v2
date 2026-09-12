/**
 * lib/location-cache.ts (apps/pos-local)
 * -----------------------------------------------------------------------
 * Đọc LocationCache (đồng bộ xuống từ dashboard, đã lọc đúng storeId +
 * status=approved ở phía cloud — xem lib/sync.ts pullConfig()). Dùng làm
 * ngữ cảnh gợi ý địa điểm cho tính năng "Vi vu Đà Lạt" (api/travel-quiz).
 * -----------------------------------------------------------------------
 */

import { requireDb } from "@/lib/api";

export type CachedLocation = {
  id: string;
  name: string;
  description: string;
  category: string;
  bestTimeToVisit: string | null;
  relatedLocationIds: string[];
};

function mapRow(r: {
  id: string;
  name: string;
  description: string;
  category: string;
  bestTimeToVisit: string | null;
  relatedLocationIdsJson: string;
}): CachedLocation {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    bestTimeToVisit: r.bestTimeToVisit,
    relatedLocationIds: JSON.parse(r.relatedLocationIdsJson) as string[],
  };
}

/** Toàn bộ location đã duyệt của quán này — dùng cho GET /api/locations (trang "Hộ chiếu Đà Lạt" cần biết tên/category để hiển thị gợi ý liên quan). */
export async function getAllLocations(): Promise<CachedLocation[]> {
  const db = requireDb();
  const rows = await db.locationCache.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapRow);
}

/**
 * Lọc theo category dựa trên câu trả lời đầu của khách (vd "thiên nhiên",
 * "check-in"...) — giống tinh thần filter theo tag của order-quiz nhưng áp
 * dụng thật (order-quiz cố tình KHÔNG lọc vì menu quá nhỏ; location có thể
 * nhiều hơn nên lọc ngay từ đầu). Match không phân biệt hoa/thường, so khớp
 * một phần (vd "thiên nhiên" khớp "thiên nhiên, yên tĩnh" nếu category ghép).
 * Nếu không khớp category nào, trả về toàn bộ (an toàn hơn là trả rỗng).
 */
export async function selectLocationsByCategory(category: string | null, max = 12): Promise<CachedLocation[]> {
  const all = await getAllLocations();
  if (!category) return all.slice(0, max);

  const needle = category.toLowerCase().trim();
  const matched = all.filter((l) => l.category.toLowerCase().includes(needle) || needle.includes(l.category.toLowerCase()));

  return (matched.length > 0 ? matched : all).slice(0, max);
}

export function buildLocationContextBlock(locations: CachedLocation[]): string {
  if (locations.length === 0) {
    return "### ĐỊA ĐIỂM ĐÀ LẠT HIỆN CÓ:\n(Chưa có địa điểm nào được duyệt cho quán này.)";
  }
  const lines = locations.map((l) => {
    const time = l.bestTimeToVisit ? ` | Nên ghé: ${l.bestTimeToVisit}` : "";
    return `- id="${l.id}" | **${l.name}** | ${l.category}${time} | ${l.description}`;
  });
  return ["### ĐỊA ĐIỂM ĐÀ LẠT HIỆN CÓ (chỉ được gợi ý đúng các địa điểm trong danh sách này):", ...lines].join("\n");
}
