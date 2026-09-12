import { NextRequest, NextResponse } from "next/server";
import { requireDb } from "@/lib/api";
import { hasValidOpsSession } from "@/lib/ops-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/print-photos/:id/image — dùng làm src cho <img> ở /ops/print-photos
// và ở trang in /print/:id. Cần đăng nhập (ảnh khuôn mặt khách).
export async function GET(req: NextRequest, { params }: Params) {
  if (!hasValidOpsSession(req)) {
    return new NextResponse("Chưa đăng nhập.", { status: 401 });
  }

  const { id } = await params;

  try {
    const db = requireDb();
    const photo = await db.printPhoto.findUnique({ where: { id } });
    if (!photo) return new NextResponse("Not found", { status: 404 });

    return new NextResponse(new Uint8Array(photo.data), {
      status: 200,
      headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=31536000, immutable" },
    });
  } catch (err) {
    console.error("[/api/print-photos/:id/image] error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
