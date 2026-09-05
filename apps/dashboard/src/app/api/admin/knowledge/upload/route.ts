/**
 * app/api/admin/knowledge/upload/route.ts
 * -----------------------------------------------------------------------
 * Nhận file PDF (multipart/form-data), lưu KnowledgeDocument (status
 * "processing"), gọi Claude để extract topic, rồi trả các topic vừa
 * trích xuất về cho client REVIEW (chưa ghi KnowledgeTopic vào DB).
 *
 * Document chuyển sang status "pending_review" - admin phải duyệt qua
 * modal (xem POST/DELETE ở upload/[id]/route.ts) thì topic mới thực sự
 * được ghi vào database.
 *
 * Lưu ý: nên giới hạn kích thước file (vd 10MB) và chỉ nhận .pdf.
 * -----------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireDb, requirePermission } from "@/lib/api";
import { extractTopicsFromPdf } from "@/lib/knowledge-extraction";

const MAX_FILE_SIZE_MB = 10;

export async function POST(req: NextRequest) {
  try {
    await requirePermission(req, "knowledge");
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file PDF." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Chỉ nhận file .pdf." }, { status: 400 });
  }

  const fileSizeKb = Math.round(file.size / 1024);
  if (fileSizeKb > MAX_FILE_SIZE_MB * 1024) {
    return NextResponse.json(
      { error: `File vượt quá ${MAX_FILE_SIZE_MB}MB.` },
      { status: 400 }
    );
  }

  const db = requireDb();
  const document = await db.knowledgeDocument.create({
    data: {
      fileName: file.name,
      fileSizeKb,
      status: "processing",
    },
  });

  try {
    const categories = await db.knowledgeCategory.findMany({
      select: { id: true, name: true },
    });
    const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));
    const fallbackCategoryId =
      categoryIdByName.get("Khác") ?? categories[0]?.id;
    if (!fallbackCategoryId) {
      throw new Error("Chưa có category nào trong hệ thống, hãy tạo category trước.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfBase64 = buffer.toString("base64");

    const extracted = await extractTopicsFromPdf({
      pdfBase64,
      fileName: file.name,
      categoryNames: categories.map((c) => c.name),
    });

    if (extracted.length === 0) {
      throw new Error("Không trích xuất được topic nào từ file này.");
    }

    await db.knowledgeDocument.update({
      where: { id: document.id },
      data: { status: "pending_review" },
    });

    return NextResponse.json({
      documentId: document.id,
      fileName: file.name,
      topics: extracted.map((t) => ({
        title: t.title,
        content: t.content,
        categoryId: categoryIdByName.get(t.categoryName) ?? fallbackCategoryId,
        keywords: t.keywords,
      })),
    });
  } catch (err) {
    await db.knowledgeDocument.update({
      where: { id: document.id },
      data: {
        status: "failed",
        errorMsg: err instanceof Error ? err.message : "Lỗi không xác định.",
      },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction thất bại." },
      { status: 500 }
    );
  }
}
