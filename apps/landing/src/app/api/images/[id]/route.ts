import { NextRequest, NextResponse } from "next/server";
import { getCloudClient } from "@cbd/database";

const prisma = getCloudClient();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/images/:id — dùng làm src cho <img> trên trang chủ. Công khai
// (không cần đăng nhập). apps/dashboard có route giống hệt cho ảnh dùng
// trong admin UI — cả 2 đọc thẳng cùng 1 bảng MediaAsset trên Neon.
export async function GET(_req: NextRequest, { params }: Params) {
  if (!prisma) {
    return new NextResponse("Database not configured", { status: 503 });
  }
  const { id } = await params;
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { data: true, mimeType: true } });
    if (!asset) return new NextResponse("Not found", { status: 404 });

    return new NextResponse(new Uint8Array(asset.data), {
      status: 200,
      headers: { "Content-Type": asset.mimeType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (err) {
    console.error("[/api/images/:id] error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
