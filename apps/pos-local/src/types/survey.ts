import type { DetailKey, ExperienceKey } from "@/lib/survey-config";

export type RatedAnswer = { rating: number; note: string };

/** Mô hình dữ liệu 1 lượt khảo sát hoàn chỉnh (lưu ở SurveyResponse.dataJson). */
export type SurveyData = {
  submittedAt: string;
  name: string;
  drink: RatedAnswer;
  experiences: ExperienceKey[];
  experienceRatings: Partial<Record<ExperienceKey, RatedAnswer>>;
  space: RatedAnswer;
  staff: RatedAnswer;
  details: Partial<Record<DetailKey, string>>;
  suggestion: string;
};

/** Body client gửi lên POST /api/survey — submittedAt do server đóng dấu. */
export type SurveySubmitPayload = Omit<SurveyData, "submittedAt">;

/** 1 dòng trả về từ GET /api/survey (màn hình quản trị). */
export type SurveyRecord = {
  id: string;
  createdAt: string;
  data: SurveyData;
};
