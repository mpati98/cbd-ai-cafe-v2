/**
 * lib/knowledge-extraction.ts
 * -----------------------------------------------------------------------
 * Gửi PDF trực tiếp cho Claude (Claude đọc PDF native, không cần lib
 * parse PDF riêng) và yêu cầu tách nội dung thành các "topic" nhỏ, mỗi
 * topic được xếp vào 1 trong các category lớn (tầng 1) đã tồn tại.
 *
 * Danh sách category được truyền động vào prompt (fetch từ DB), để khi
 * admin thêm/sửa category mới, extraction luôn dùng đúng danh sách hiện tại.
 *
 * Dùng model mạnh hơn (Sonnet) vì bước này chỉ chạy khi admin upload
 * file (không phải hot-path chatbot), ưu tiên độ chính xác hơn chi phí.
 * -----------------------------------------------------------------------
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ExtractedTopic = {
  title: string;
  content: string;
  categoryName: string; // phải khớp 1 trong các category truyền vào, hoặc "Khác"
  keywords: string[];
};

function buildExtractionSystemPrompt(categoryNames: string[]) {
  return `
Bạn là hệ thống trích xuất kiến thức cho chatbot tư vấn khách hàng của một quán cà phê ở Đà Lạt.
Đọc tài liệu PDF được cung cấp và tách nội dung thành các TOPIC nhỏ, độc lập, mỗi topic là một
đơn vị kiến thức mà bot có thể dùng để trả lời trực tiếp 1 câu hỏi của khách (không quá dài,
không gộp nhiều chủ đề không liên quan vào 1 topic).

Mỗi topic PHẢI được xếp vào đúng 1 trong các category (topic lớn) sau:
${categoryNames.map((c) => `- ${c}`).join("\n")}

Nếu nội dung không khớp category nào ở trên, dùng categoryName = "Khác".
KHÔNG tự đặt category mới ngoài danh sách trên.

Với mỗi topic, xác định:
- title: tiêu đề ngắn gọn (dưới 10 từ)
- content: nội dung tóm tắt, viết lại tự nhiên, đủ để bot trả lời khách (2-6 câu)
- categoryName: đúng 1 tên trong danh sách category ở trên (hoặc "Khác")
- keywords: 3-6 từ khóa tiếng Việt không dấu và có dấu mà khách có thể dùng để hỏi

CHỈ trả lời bằng JSON hợp lệ, không markdown, không giải thích thêm, theo format:
{ "topics": [ { "title": "...", "content": "...", "categoryName": "...", "keywords": ["...", "..."] } ] }
`.trim();
}

export async function extractTopicsFromPdf(params: {
  pdfBase64: string;
  fileName: string;
  categoryNames: string[];
}): Promise<ExtractedTopic[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: buildExtractionSystemPrompt(params.categoryNames),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: params.pdfBase64,
            },
          },
          {
            type: "text",
            text: `Trích xuất topic từ file "${params.fileName}" theo đúng format JSON đã yêu cầu.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude không trả về nội dung text hợp lệ.");
  }

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();

  let parsed: { topics: ExtractedTopic[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Không parse được JSON từ Claude, kiểm tra lại prompt/response.");
  }

  if (!Array.isArray(parsed.topics)) {
    throw new Error("Response JSON thiếu field 'topics'.");
  }

  return parsed.topics;
}
