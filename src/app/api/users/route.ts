import { NextRequest } from "next/server";
import { ApiError, created, ok, parseBody, requireAdminRole, requireDb, withErrorHandling } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  permissions: true,
  createdAt: true,
} as const;

// GET /api/users — danh sách tài khoản (không kèm passwordHash). Chỉ ADMIN.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAdminRole(req);
  const db = requireDb();
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, select: USER_SELECT });
  return ok(users);
});

// POST /api/users — tạo tài khoản mới. Chỉ ADMIN.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireAdminRole(req);
  const body = await parseBody(req, userCreateSchema);
  const db = requireDb();

  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) throw new ApiError(409, "Email này đã có tài khoản.");

  const passwordHash = await hashPassword(body.password);
  const user = await db.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash,
      role: body.role,
      permissions: body.role === "ADMIN" ? [] : body.permissions,
    },
    select: USER_SELECT,
  });
  return created(user);
});
