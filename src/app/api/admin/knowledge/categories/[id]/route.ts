/**
 * app/api/admin/knowledge/categories/[id]/route.ts
 * -----------------------------------------------------------------------
 * PUT    -> đổi tên/mô tả category.
 * DELETE -> xóa category. Chặn xóa nếu còn topic con (Restrict trong
 *           schema) - yêu cầu admin chuyển/xóa topic con trước, tránh
 *           mất dữ liệu hoặc topic bị "mồ côi" ngoài ý muốn.
 * -----------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireDb, requirePermission } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requirePermission(req, "knowledge");
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await params;
  const body = await req.json();
  const { name, description } = body;

  const db = requireDb();
  const category = await db.knowledgeCategory.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
  });

  return NextResponse.json({ category });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requirePermission(req, "knowledge");
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await params;
  const db = requireDb();
  const topicCount = await db.knowledgeTopic.count({
    where: { categoryId: id },
  });

  if (topicCount > 0) {
    return NextResponse.json(
      {
        error: `Category này còn ${topicCount} topic con. Chuyển hoặc xóa các topic con trước.`,
      },
      { status: 400 }
    );
  }

  await db.knowledgeCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
