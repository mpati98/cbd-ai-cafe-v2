import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser, userHasPermission } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth-types";

/** Thrown by helpers below; caught centrally by `withErrorHandling`. */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Ensures Neon/Prisma is actually configured before touching the database. */
export function requireDb() {
  if (!prisma) {
    throw new ApiError(
      503,
      "Database chưa được cấu hình. Đặt DATABASE_URL/DIRECT_URL trong .env rồi chạy `npm run db:push`."
    );
  }
  return prisma;
}

/** Yêu cầu đã đăng nhập (phiên hợp lệ qua cookie). Không yêu cầu quyền cụ thể. */
export async function requireUser(req: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(req);
  if (!user) {
    throw new ApiError(401, "Chưa đăng nhập hoặc phiên đã hết hạn.");
  }
  return user;
}

/**
 * Yêu cầu đã đăng nhập VÀ có quyền `key` (ADMIN luôn qua, STAFF cần có `key`
 * trong `permissions`). Dùng thay cho `requireAdmin` cũ (x-api-key) ở mọi
 * route ghi/đọc dữ liệu quản trị.
 */
export async function requirePermission(req: NextRequest, key: string): Promise<SessionUser> {
  const user = await requireUser(req);
  if (!userHasPermission(user, key)) {
    throw new ApiError(403, "Tài khoản của bạn không có quyền truy cập mục này.");
  }
  return user;
}

/**
 * Yêu cầu role ADMIN thật sự — dùng cho quản lý người dùng (tạo/sửa/xoá tài
 * khoản, cấp quyền). Đây KHÔNG phải 1 quyền có thể cấp qua `permissions` —
 * chỉ ADMIN mới được, STAFF dù có permissions gì cũng không được.
 */
export async function requireAdminRole(req: NextRequest): Promise<SessionUser> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Chỉ tài khoản ADMIN mới quản lý được người dùng.");
  }
  return user;
}

/** Parses + validates a JSON request body against a zod schema. */
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Body không phải JSON hợp lệ.");
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiError(400, "Dữ liệu không hợp lệ.", result.error.flatten());
  }
  return result.data;
}

/** Parses pagination-ish / filter query params into plain object. */
export function queryParams(req: Request) {
  return Object.fromEntries(new URL(req.url).searchParams.entries());
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function created(data: unknown) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/** Wraps a route handler so every thrown error becomes a consistent JSON response. */
export function withErrorHandling<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>
) {
  return async (...args: A): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { ok: false, error: err.message, details: err.details ?? null },
          { status: err.status }
        );
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { ok: false, error: "Dữ liệu không hợp lệ.", details: err.flatten() },
          { status: 400 }
        );
      }
      // Prisma unique constraint violation
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { ok: false, error: "Giá trị đã tồn tại (vi phạm ràng buộc duy nhất).", details: (err as { meta?: unknown }).meta ?? null },
          { status: 409 }
        );
      }
      // Prisma "record not found" (e.g. update/delete on missing id)
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2025") {
        return NextResponse.json({ ok: false, error: "Không tìm thấy bản ghi." }, { status: 404 });
      }
      // Bảng chưa tồn tại trên DB (đã sửa schema.prisma nhưng chưa `db:push`)
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2021") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Bảng chưa tồn tại trên database. Schema đã có model mới nhưng chưa được đẩy lên Neon — chạy `npm run db:push` rồi thử lại.",
          },
          { status: 500 }
        );
      }
      // Bảng đã có nhưng THIẾU CỘT (đã thêm field mới vào schema.prisma và
      // generate lại client, nhưng chưa db:push để tạo cột đó trên Neon)
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2022") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Thiếu cột trên database (schema có field mới nhưng chưa đẩy lên Neon) — chạy `npm run db:push` rồi thử lại.",
          },
          { status: 500 }
        );
      }
      // Prisma Client cũ chưa được generate lại sau khi schema.prisma đổi
      // (vd. thêm model Order) — biểu hiện là gọi db.<model>.<method> ra
      // "Cannot read properties of undefined". Rất dễ gặp khi cập nhật code
      // nhưng quên chạy lại generate.
      if (err instanceof TypeError && /Cannot read propert(y|ies) .* of undefined/.test(err.message)) {
        console.error("[API] Prisma Client có vẻ chưa khớp schema mới nhất:", err);
        return NextResponse.json(
          {
            ok: false,
            error:
              "Prisma Client chưa khớp với schema mới nhất. Chạy `npx prisma generate` (và `npm run db:push` nếu có bảng mới) rồi khởi động lại server.",
          },
          { status: 500 }
        );
      }
      console.error("[API] Unhandled error:", err);
      return NextResponse.json({ ok: false, error: "Lỗi máy chủ không xác định." }, { status: 500 });
    }
  };
}
