import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { getLocalClient } from "@cbd/database";

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

/** Ensures SQLite/Prisma cục bộ đã cấu hình trước khi truy vấn. Không có khái
 * niệm auth ở pos-local (thiết bị LAN tại quán, bảo mật vật lý) — khác
 * apps/dashboard's requireDb/requirePermission. */
export function requireDb() {
  const db = getLocalClient();
  if (!db) {
    throw new ApiError(503, "Database cục bộ chưa được cấu hình (thiếu LOCAL_DATABASE_URL).");
  }
  return db;
}

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

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function created(data: unknown) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

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
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { ok: false, error: "Giá trị đã tồn tại (vi phạm ràng buộc duy nhất).", details: (err as { meta?: unknown }).meta ?? null },
          { status: 409 }
        );
      }
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2025") {
        return NextResponse.json({ ok: false, error: "Không tìm thấy bản ghi." }, { status: 404 });
      }
      console.error("[API] Unhandled error:", err);
      return NextResponse.json({ ok: false, error: "Lỗi máy chủ không xác định." }, { status: 500 });
    }
  };
}
