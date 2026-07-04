import { NextRequest } from "next/server";
import { created, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { branchCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/branches — list all branches, ordered by `order`.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "branches");
  const db = requireDb();
  const items = await db.branch.findMany({ orderBy: { order: "asc" } });
  return ok(items);
});

// POST /api/branches — create a branch. Yêu cầu đăng nhập + đúng quyền.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "branches");
  const data = await parseBody(req, branchCreateSchema);
  const db = requireDb();
  const item = await db.branch.create({ data });
  return created(item);
});
