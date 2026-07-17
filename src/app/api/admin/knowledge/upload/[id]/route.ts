/**
 * app/api/admin/knowledge/upload/[id]/route.ts
 * -----------------------------------------------------------------------
 * Bước duyệt sau khi upload PDF: admin xem lại (và có thể sửa) các topic
 * Claude vừa trích xuất trong modal ở FE trước khi chúng thực sự được
 * ghi vào database.
 *
 * POST   -> Duyệt: ghi danh sách topic (đã review/sửa) vào KnowledgeTopic,
 *           chuyển document sang status "done".
 * DELETE -> Từ chối: hủy document (chưa có topic nào gắn vào nên xóa an toàn).
 * -----------------------------------------------------------------------
 */

import { NextRequest } from "next/server";
import { ApiError, noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { knowledgeUploadConfirmSchema } from "@/lib/schemas";
import { recomputeTopicScores } from "@/lib/knowledge-scoring";

type Params = { params: Promise<{ id: string }> };

export const POST = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "knowledge");
  const { id } = await params;
  const { topics = [] } = await parseBody(req, knowledgeUploadConfirmSchema);
  const db = requireDb();

  const document = await db.knowledgeDocument.findUnique({ where: { id } });
  if (!document) {
    throw new ApiError(404, "Không tìm thấy tài liệu.");
  }

  if (topics.length > 0) {
    await db.knowledgeTopic.createMany({
      data: topics.map((t) => ({
        documentId: id,
        title: t.title,
        content: t.content,
        categoryId: t.categoryId,
        keywords: t.keywords,
      })),
    });
  }

  await db.knowledgeDocument.update({
    where: { id },
    data: { status: "done", processedAt: new Date() },
  });

  await recomputeTopicScores();

  return ok({ topicsCreated: topics.length });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "knowledge");
  const { id } = await params;
  const db = requireDb();

  await db.knowledgeDocument.delete({ where: { id } });

  return noContent();
});
