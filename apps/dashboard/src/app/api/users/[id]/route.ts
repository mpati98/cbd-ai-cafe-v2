import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requireAdminRole, requireDb, withErrorHandling } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  permissions: true,
  createdAt: true,
} as const;

// PATCH /api/users/:id — sửa tên/mật khẩu/role/quyền. Chỉ ADMIN.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requireAdminRole(req);
  const { id } = await params;
  const body = await parseBody(req, userUpdateSchema);
  const db = requireDb();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.role !== undefined) data.role = body.role;
  if (body.permissions !== undefined) data.permissions = body.permissions;
  if (body.role === "ADMIN") data.permissions = []; // ADMIN không cần permissions lẻ
  if (body.password) data.passwordHash = await hashPassword(body.password);

  const user = await db.user.update({ where: { id }, data, select: USER_SELECT });
  return ok(user);
});

// DELETE /api/users/:id — xoá tài khoản. Chỉ ADMIN. Không cho tự xoá chính
// mình, và không cho xoá ADMIN cuối cùng (tránh khoá luôn hệ thống).
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  const currentUser = await requireAdminRole(req);
  const { id } = await params;

  if (id === currentUser.id) {
    throw new ApiError(400, "Không thể tự xoá chính tài khoản đang đăng nhập.");
  }

  const db = requireDb();
  const target = await db.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "Không tìm thấy tài khoản này.");

  if (target.role === "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new ApiError(400, "Không thể xoá ADMIN duy nhất còn lại của hệ thống.");
    }
  }

  await db.user.delete({ where: { id } });
  return noContent();
});
