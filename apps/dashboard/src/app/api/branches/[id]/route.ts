import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { branchUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/branches/:id
export const GET = withErrorHandling(async (_req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const db = requireDb();
  const item = await db.branch.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, "Không tìm thấy chi nhánh này.");
  return ok(item);
});

// PATCH /api/branches/:id — Yêu cầu đăng nhập + đúng quyền.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "branches");
  const { id } = await params;
  const data = await parseBody(req, branchUpdateSchema);
  const db = requireDb();
  const item = await db.branch.update({ where: { id }, data });
  return ok(item);
});

// DELETE /api/branches/:id — Yêu cầu đăng nhập + đúng quyền.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "branches");
  const { id } = await params;
  const db = requireDb();
  await db.branch.delete({ where: { id } });
  return noContent();
});
