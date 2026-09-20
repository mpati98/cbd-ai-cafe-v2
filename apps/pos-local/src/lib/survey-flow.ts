/**
 * Engine luồng câu hỏi khảo sát (thuần logic, không phụ thuộc React) — dựng
 * danh sách bước từ "bản nháp" câu trả lời hiện có. Số bước tổng thay đổi động
 * vì có 2 nguồn chèn thêm:
 *   1. Mỗi trải nghiệm khách đã chọn ở bước "experiences" -> 1 câu rating riêng.
 *   2. Mọi câu rating <= LOW_RATING_MAX -> 1 câu text tuỳ chọn hỏi lý do.
 * Các bước chèn luôn nằm NGAY SAU bước hiện tại nên chỉ số bước đang đứng
 * không bị xê dịch khi danh sách được dựng lại.
 */

import {
  EXPERIENCE_LABELS,
  LOW_RATING_MAX,
  type DetailKey,
  type ExperienceKey,
} from "@/lib/survey-config";
import type { RatedAnswer, SurveySubmitPayload } from "@/types/survey";

/** Đối tượng được đánh giá — cũng chính là key trong `details` của mô hình dữ liệu. */
export type RatingTarget = "drink" | "space" | "staff" | `exp_${ExperienceKey}`;

export type SurveyDraft = {
  name: string;
  drink: RatedAnswer | null;
  /** null = chưa trả lời bước chọn trải nghiệm; [] = đã bỏ qua. */
  experiences: ExperienceKey[] | null;
  experienceRatings: Partial<Record<ExperienceKey, RatedAnswer>>;
  space: RatedAnswer | null;
  staff: RatedAnswer | null;
  details: Partial<Record<DetailKey, string>>;
  suggestion: string;
};

export type Step =
  | { id: string; kind: "name"; eyebrow: string; prompt: string }
  | { id: string; kind: "rating"; eyebrow: string; prompt: string; target: RatingTarget }
  | { id: string; kind: "multiselect"; eyebrow: string; prompt: string }
  | { id: string; kind: "detail"; eyebrow: string; prompt: string; target: RatingTarget }
  | { id: string; kind: "suggestion"; eyebrow: string; prompt: string };

export const emptyDraft: SurveyDraft = {
  name: "",
  drink: null,
  experiences: null,
  experienceRatings: {},
  space: null,
  staff: null,
  details: {},
  suggestion: "",
};

const SECTION_EYEBROW: Record<"drink" | "space" | "staff" | "exp", string> = {
  drink: "Thức uống",
  space: "Không gian",
  staff: "Nhân viên",
  exp: "Trải nghiệm",
};

function eyebrowOf(target: RatingTarget): string {
  return target.startsWith("exp_") ? SECTION_EYEBROW.exp : SECTION_EYEBROW[target as "drink" | "space" | "staff"];
}

/** Tên mục dùng trong câu hỏi rẽ nhánh: "Điều gì khiến bạn chưa hài lòng về {tên mục}?" */
function targetName(target: RatingTarget): string {
  if (target === "drink") return "thức uống";
  if (target === "space") return "không gian quán";
  if (target === "staff") return "thái độ phục vụ của nhân viên";
  return `trải nghiệm "${EXPERIENCE_LABELS[target.slice(4) as ExperienceKey]}"`;
}

export function ratingOf(draft: SurveyDraft, target: RatingTarget): RatedAnswer | null {
  if (target === "drink") return draft.drink;
  if (target === "space") return draft.space;
  if (target === "staff") return draft.staff;
  return draft.experienceRatings[target.slice(4) as ExperienceKey] ?? null;
}

export function withRating(draft: SurveyDraft, target: RatingTarget, value: RatedAnswer): SurveyDraft {
  if (target === "drink") return { ...draft, drink: value };
  if (target === "space") return { ...draft, space: value };
  if (target === "staff") return { ...draft, staff: value };
  const key = target.slice(4) as ExperienceKey;
  return { ...draft, experienceRatings: { ...draft.experienceRatings, [key]: value } };
}

export function withDetail(draft: SurveyDraft, target: RatingTarget, text: string): SurveyDraft {
  const trimmed = text.trim();
  const details = { ...draft.details };
  if (trimmed) details[target as DetailKey] = trimmed;
  else delete details[target as DetailKey];
  return { ...draft, details };
}

function ratingSteps(draft: SurveyDraft, target: RatingTarget, prompt: string): Step[] {
  const eyebrow = eyebrowOf(target);
  const steps: Step[] = [{ id: `rating:${target}`, kind: "rating", eyebrow, prompt, target }];
  const answered = ratingOf(draft, target);
  if (answered && answered.rating <= LOW_RATING_MAX) {
    steps.push({
      id: `detail:${target}`,
      kind: "detail",
      eyebrow,
      prompt: `Điều gì khiến bạn chưa hài lòng về ${targetName(target)}?`,
      target,
    });
  }
  return steps;
}

export function buildSteps(draft: SurveyDraft): Step[] {
  const name = draft.name.trim();
  const steps: Step[] = [
    {
      id: "name",
      kind: "name",
      eyebrow: "Làm quen",
      prompt: "Xin chào, mình là CBD Robot của CBD AI Cafe! Bạn tên là gì nhỉ?",
    },
    ...ratingSteps(draft, "drink", `Rất vui được gặp ${name}! Thức uống ở quán hôm nay ngon miệng chứ?`),
    {
      id: "experiences",
      kind: "multiselect",
      eyebrow: SECTION_EYEBROW.exp,
      prompt: "Hôm nay bạn đã thử những trải nghiệm nào tại quán?",
    },
  ];

  // Đúng thứ tự khách chọn — không sắp xếp lại theo danh sách gốc.
  for (const key of draft.experiences ?? []) {
    steps.push(...ratingSteps(draft, `exp_${key}`, `Bạn thấy trải nghiệm "${EXPERIENCE_LABELS[key]}" thế nào?`));
  }

  steps.push(
    ...ratingSteps(draft, "space", "Bạn thấy không gian quán hôm nay thế nào?"),
    ...ratingSteps(draft, "staff", "Bạn thấy thái độ phục vụ của nhân viên quán hôm nay thế nào?"),
    {
      id: "suggestion",
      kind: "suggestion",
      eyebrow: "Góp ý",
      prompt: "Bạn có góp ý hay mong muốn gì cho CBD AI Cafe trong tương lai không?",
    }
  );

  return steps;
}

/** Chuyển bản nháp đã đầy đủ thành payload gửi API (null nếu còn thiếu rating bắt buộc). */
export function toSubmitPayload(draft: SurveyDraft): SurveySubmitPayload | null {
  if (!draft.drink || !draft.space || !draft.staff) return null;
  const experiences = draft.experiences ?? [];
  const experienceRatings: SurveySubmitPayload["experienceRatings"] = {};
  for (const key of experiences) {
    const rated = draft.experienceRatings[key];
    if (rated) experienceRatings[key] = rated;
  }
  return {
    name: draft.name.trim(),
    drink: draft.drink,
    experiences,
    experienceRatings,
    space: draft.space,
    staff: draft.staff,
    details: draft.details,
    suggestion: draft.suggestion.trim(),
  };
}
