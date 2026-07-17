/**
 * app/api/admin/knowledge/[id]/route.ts
 * -----------------------------------------------------------------------
 * PUT    -> sửa nội dung 1 topic (đánh dấu isManual = true sau khi sửa,
 *           vì nội dung không còn nguyên gốc từ PDF nữa).
 * DELETE -> xóa 1 topic.
 * -----------------------------------------------------------------------
 */

import { NextRequest } from "next/server";
import { noContent, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { knowledgeTopicUpdateSchema } from "@/lib/schemas";
import { recomputeTopicScores } from "@/lib/knowledge-scoring";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const PUT = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "knowledge");
  const { id } = await params;
  const data = await parseBody(req, knowledgeTopicUpdateSchema);
  const db = requireDb();

  const topic = await db.knowledgeTopic.update({
    where: { id },
    data: { ...data, isManual: true },
  });

  return ok({ topic });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "knowledge");
  const { id } = await params;
  const db = requireDb();

  await db.knowledgeTopic.delete({ where: { id } });
  await recomputeTopicScores();

  return noContent();
});
