import { NextRequest } from "next/server";
import sharp from "sharp";
import { ApiError, created, ok, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { MAX_UPLOAD_BYTES, MEDIA_PRESETS, MediaPurpose } from "@/lib/media";

// sharp cần Node.js runtime (không chạy được trên Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_SELECT = {
  id: true,
  purpose: true,
  note: true,
  width: true,
  height: true,
  mimeType: true,
  byteSize: true,
  createdAt: true,
} as const;

// GET /api/media — danh sách ảnh đã upload (không kèm dữ liệu nhị phân).
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "media");
  const db = requireDb();
  const purpose = new URL(req.url).searchParams.get("purpose");
  const items = await db.mediaAsset.findMany({
    where: purpose ? { purpose: purpose as MediaPurpose } : undefined,
    orderBy: { createdAt: "desc" },
    select: MEDIA_SELECT,
  });
  return ok(items);
});

// POST /api/media — upload ảnh gốc (multipart/form-data: file, purpose, note),
// tự động resize + convert sang WebP theo kích thước chuẩn của `purpose`.
// Yêu cầu đăng nhập + đúng quyền.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "media");

  const form = await req.formData();
  const file = form.get("file");
  const purpose = form.get("purpose");
  const note = form.get("note");

  if (!(file instanceof Blob)) throw new ApiError(400, "Thiếu file ảnh (field 'file').");
  if (typeof purpose !== "string" || !(purpose in MEDIA_PRESETS)) {
    throw new ApiError(400, "Thiếu hoặc sai 'purpose' (phải là HERO hoặc MENU).");
  }
  if (typeof note !== "string" || note.trim().length < 3) {
    throw new ApiError(400, "Cần ghi chú (tối thiểu 3 ký tự) mô tả ảnh dùng cho phần nào.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(400, `Ảnh quá lớn (tối đa ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB).`);
  }

  const db = requireDb();
  const preset = MEDIA_PRESETS[purpose as MediaPurpose];
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .rotate() // tôn trọng EXIF orientation
      .resize(preset.width, preset.height, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ApiError(400, "Không đọc được ảnh. Hãy thử file JPG/PNG/WebP khác.");
  }

  // Prisma 7 (TS strict) muốn Uint8Array<ArrayBuffer> cho field Bytes —
  // Buffer.buffer có thể là ArrayBufferLike (SharedArrayBuffer cũng hợp lệ),
  // không khớp type chặt này. Cấp phát Uint8Array mới theo đúng độ dài (luôn
  // backed bởi ArrayBuffer thường) rồi copy dữ liệu vào — cách chắc chắn nhất,
  // không phụ thuộc cách TypeScript suy luận overload của Uint8Array(buffer).
  const outputBytes = new Uint8Array(outputBuffer.byteLength);
  outputBytes.set(outputBuffer);

  const asset = await db.mediaAsset.create({
    data: {
      purpose: purpose as MediaPurpose,
      note: note.trim().slice(0, 300),
      width: preset.width,
      height: preset.height,
      mimeType: "image/webp",
      byteSize: outputBuffer.byteLength,
      data: outputBytes,
    },
    select: MEDIA_SELECT,
  });

  return created(asset);
});
