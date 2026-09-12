import { NextRequest } from "next/server";
import { ApiError, created, ok, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { printPhotoCreateSchema } from "@/lib/schemas";
import { requireOpsAuth } from "@/lib/ops-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

// GET /api/print-photos — danh sách ảnh chờ in tại quầy (dùng bởi
// /ops/print-photos, cần đăng nhập). Không trả field `data` (blob ảnh) để
// danh sách nhẹ.
export const GET = withErrorHandling(async (req: NextRequest) => {
  requireOpsAuth(req);
  const db = requireDb();
  const photos = await db.printPhoto.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, careerName: true, isPrinted: true, createdAt: true },
  });
  return ok(photos);
});

// POST /api/print-photos — khách bấm "In ảnh" ở trang /career-prediction gửi
// ảnh đã ghép (4x6 inch, data URL base64) lên đây để nhân viên in tại quầy.
// Không cần đăng nhập (thiết bị LAN tại quán).
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await parseBody(req, printPhotoCreateSchema);

  if (body.imageDataUrl.length > 8_000_000) {
    throw new ApiError(400, "Ảnh quá lớn.");
  }
  const parsed = parseDataUrl(body.imageDataUrl);
  if (!parsed) {
    throw new ApiError(400, "Ảnh không hợp lệ.");
  }

  const db = requireDb();
  const photo = await db.printPhoto.create({
    data: {
      careerName: body.careerName,
      mimeType: parsed.mimeType,
      data: Buffer.from(parsed.base64, "base64"),
    },
    select: { id: true, careerName: true, isPrinted: true, createdAt: true },
  });

  return created(photo);
});
