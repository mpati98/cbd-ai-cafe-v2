import { NextRequest, NextResponse } from "next/server";
import { requireDb } from "@/lib/api";
import { fetchAndCacheImage } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/images/:id — dùng làm src cho <img> trên trang /order. Ảnh không
// lưu blob local từ đầu (SQLite chỉ cache theo yêu cầu) — cache-through: đọc
// ImageCache trước, miss thì fetch từ dashboard (route công khai) rồi lưu lại.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = requireDb();

  try {
    const cached = await db.imageCache.findUnique({ where: { id } });
    if (cached) {
      return new NextResponse(new Uint8Array(cached.data), {
        status: 200,
        headers: { "Content-Type": cached.mimeType, "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }

    const fetched = await fetchAndCacheImage(id);
    if (!fetched) return new NextResponse("Not found", { status: 404 });

    return new NextResponse(new Uint8Array(fetched.data), {
      status: 200,
      headers: { "Content-Type": fetched.mimeType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (err) {
    console.error("[/api/images/:id] error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
