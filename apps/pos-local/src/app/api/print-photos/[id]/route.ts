import { NextRequest } from "next/server";
import { noContent, ok, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { printPhotoUpdateSchema } from "@/lib/schemas";
import { requireOpsAuth } from "@/lib/ops-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/print-photos/:id — nhân viên đánh dấu đã in (dùng bởi /ops/print-photos, cần đăng nhập).
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  requireOpsAuth(req);
  const { id } = await params;
  const data = await parseBody(req, printPhotoUpdateSchema);
  const db = requireDb();
  const photo = await db.printPhoto.update({
    where: { id },
    data,
    select: { id: true, careerName: true, isPrinted: true, createdAt: true },
  });
  return ok(photo);
});

// DELETE /api/print-photos/:id — dọn ảnh sau khi in xong (ảnh khuôn mặt khách,
// không giữ lại lâu hơn cần thiết). Cần đăng nhập.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  requireOpsAuth(req);
  const { id } = await params;
  const db = requireDb();
  await db.printPhoto.delete({ where: { id } });
  return noContent();
});
