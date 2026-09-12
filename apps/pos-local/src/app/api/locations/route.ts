import { NextResponse } from "next/server";
import { getAllLocations } from "@/lib/location-cache";

export const dynamic = "force-dynamic";

// GET /api/locations — toàn bộ địa điểm đã duyệt của quán này (đồng bộ từ
// dashboard, xem lib/location-cache.ts). Public, không cần đăng nhập — dùng
// bởi trang /travel (gợi ý lịch trình + "Hộ chiếu Đà Lạt") để tra tên/category/
// relatedLocationIds phía client (dữ liệu đã ghé lưu ở localStorage, không có
// gì nhạy cảm ở đây để phải bảo vệ).
export async function GET() {
  try {
    const locations = await getAllLocations();
    return NextResponse.json({ ok: true, data: locations });
  } catch (err) {
    console.error("[/api/locations] error:", err);
    return NextResponse.json({ ok: false, error: "Không tải được danh sách địa điểm." }, { status: 500 });
  }
}
