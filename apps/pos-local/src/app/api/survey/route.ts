import { NextRequest } from "next/server";
import { ApiError, created, noContent, ok, parseBody, requireDb, withErrorHandling } from "@/lib/api";
import { requireOpsAuth } from "@/lib/ops-auth";
import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { surveySubmitSchema } from "@/lib/schemas";
import { LOW_RATING_MAX, type DetailKey, type ExperienceKey } from "@/lib/survey-config";
import type { RatedAnswer, SurveyData, SurveyRecord } from "@/types/survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBMIT_WINDOW_MS = 60_000;
const SUBMIT_MAX_PER_WINDOW = 20;

// GET /api/survey — toàn bộ lượt khảo sát, mới nhất trước (màn hình quản trị
// /ops/survey). Cần đăng nhập nhân viên.
export const GET = withErrorHandling(async (req: NextRequest) => {
  requireOpsAuth(req);
  const db = requireDb();
  const rows = await db.surveyResponse.findMany({ orderBy: { createdAt: "desc" } });

  const records: SurveyRecord[] = [];
  for (const row of rows) {
    try {
      records.push({ id: row.id, createdAt: row.createdAt.toISOString(), data: JSON.parse(row.dataJson) as SurveyData });
    } catch {
      console.warn("[/api/survey] Bỏ qua dòng có dataJson hỏng:", row.id);
    }
  }
  return ok(records);
});

// POST /api/survey — khách hoàn thành khảo sát (không cần đăng nhập, kiosk/
// tablet tại quán). Dữ liệu được chuẩn hoá lại phía server: chỉ giữ rating của
// trải nghiệm thật sự đã chọn, chỉ giữ câu "chưa hài lòng vì..." khi rating <= 2.
export const POST = withErrorHandling(async (req: NextRequest) => {
  if (isRateLimited("survey", clientIp(req), SUBMIT_WINDOW_MS, SUBMIT_MAX_PER_WINDOW)) {
    throw new ApiError(429, "Bạn thao tác hơi nhanh, đợi mình chút nhé.");
  }
  const body = await parseBody(req, surveySubmitSchema);
  const db = requireDb();

  const experiences = [...new Set<ExperienceKey>(body.experiences)];
  const experienceRatings: Partial<Record<ExperienceKey, RatedAnswer>> = {};
  for (const key of experiences) {
    const rated = body.experienceRatings?.[key];
    if (rated) experienceRatings[key] = rated;
  }

  const ratingByTarget: Partial<Record<DetailKey, RatedAnswer>> = {
    drink: body.drink,
    space: body.space,
    staff: body.staff,
  };
  for (const key of experiences) {
    const rated = experienceRatings[key];
    if (rated) ratingByTarget[`exp_${key}`] = rated;
  }

  const details: Partial<Record<DetailKey, string>> = {};
  for (const [key, text] of Object.entries(body.details ?? {}) as [DetailKey, string][]) {
    const rated = ratingByTarget[key];
    const trimmed = text.trim();
    if (rated && rated.rating <= LOW_RATING_MAX && trimmed) details[key] = trimmed;
  }

  const data: SurveyData = {
    submittedAt: new Date().toISOString(),
    name: body.name,
    drink: body.drink,
    experiences,
    experienceRatings,
    space: body.space,
    staff: body.staff,
    details,
    suggestion: body.suggestion.trim(),
  };

  const row = await db.surveyResponse.create({
    data: {
      name: data.name,
      drinkRating: data.drink.rating,
      spaceRating: data.space.rating,
      staffRating: data.staff.rating,
      dataJson: JSON.stringify(data),
    },
    select: { id: true },
  });
  return created({ id: row.id });
});

// DELETE /api/survey — xoá toàn bộ dữ liệu khảo sát (màn hình quản trị, có
// xác nhận ở client). Cần đăng nhập nhân viên.
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  requireOpsAuth(req);
  const db = requireDb();
  await db.surveyResponse.deleteMany({});
  return noContent();
});
