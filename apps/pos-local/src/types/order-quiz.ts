/**
 * Kiểu dữ liệu dùng chung giữa client (DrinkQuiz) và server (API route +
 * lib/order-quiz.ts) cho tính năng "Chưa biết uống gì? Để CBD Robot gợi ý".
 * Tách riêng type-only khỏi order-chat.ts vì đây là 1 luồng hội thoại RIÊNG,
 * có cấu trúc trả lời khác hẳn (structured JSON theo bước hỏi/đáp, không có
 * tool add_to_cart/highlight — chỉ trả recommendations khi xong).
 * KHÔNG lưu xuống DB — toàn bộ lịch sử chỉ tồn tại trong state phía client,
 * mất khi đóng quiz/tải lại trang (tránh giữ lại dữ liệu cá nhân không cần).
 */
export type QuizTurn = { role: "user" | "assistant"; text: string };

export type QuizRecommendation = {
  itemId: string;
  name: string;
  matchScore: number; // 0-1, sắp xếp giảm dần — món hợp nhất lên đầu
  reason: string;
};

export type QuizRequestBody = {
  history: QuizTurn[];
  message: string;
  /** Mã QR bàn (nếu có) — dùng để scope quota AI theo bàn, xem lib/table-session.ts. */
  tableCode?: string | null;
};

export type QuizResponseBody = {
  message: string;
  suggestedChips: string[];
  isComplete: boolean;
  recommendations: QuizRecommendation[];
};
