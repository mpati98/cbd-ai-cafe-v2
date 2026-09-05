import { NextRequest } from "next/server";
import { noContent, requirePermission, requireDb, withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/media/:id — xoá ảnh. HeroSlide/MenuItem đang tham chiếu ảnh này
// sẽ tự động về imageId = null (onDelete: SetNull trong schema), không bị xoá theo.
// Yêu cầu đăng nhập + đúng quyền.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "media");
  const { id } = await params;
  const db = requireDb();
  await db.mediaAsset.delete({ where: { id } });
  return noContent();
});
