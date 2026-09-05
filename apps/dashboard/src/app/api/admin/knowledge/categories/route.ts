/**
 * app/api/admin/knowledge/categories/route.ts
 * -----------------------------------------------------------------------
 * GET  -> danh sách category (topic lớn tầng 1), kèm số lượng topic con.
 * POST -> tạo category mới.
 * -----------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireDb, requirePermission } from "@/lib/api";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "knowledge");
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const db = requireDb();
  const categories = await db.knowledgeCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { topics: true } } },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission(req, "knowledge");
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const body = await req.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: "Thiếu tên category." }, { status: 400 });
  }

  const db = requireDb();
  const existingCount = await db.knowledgeCategory.count();

  const category = await db.knowledgeCategory.create({
    data: {
      name,
      slug: slugify(name),
      description: description ?? null,
      sortOrder: existingCount,
    },
  });

  return NextResponse.json({ category });
}
