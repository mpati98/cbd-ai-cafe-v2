/**
 * Kiểu dữ liệu dùng chung giữa client (TravelQuiz) và server (API route +
 * lib/travel-quiz.ts) cho tính năng "Vi vu Đà Lạt" — nhân bản kiến trúc của
 * order-quiz (types/order-quiz.ts): structured JSON qua tool-calling, không
 * lưu xuống DB, lịch sử chỉ tồn tại trong state phía client.
 */
export type TravelQuizTurn = { role: "user" | "assistant"; text: string };

export type TravelPeriod = "sáng" | "chiều" | "tối";

export type TravelRecommendation = {
  locationId: string;
  name: string;
  period: TravelPeriod;
  reason: string;
};

export type TravelQuizRequestBody = {
  history: TravelQuizTurn[];
  message: string;
};

export type TravelQuizResponseBody = {
  message: string;
  suggestedChips: string[];
  isComplete: boolean;
  itinerary: TravelRecommendation[];
};
