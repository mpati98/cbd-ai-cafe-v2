import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Tạo ảnh CHECK-IN dựa trên ảnh gốc của khách bằng Gemini 2.5 Flash Image
 * ("Nano Banana") - model nổi tiếng giữ nhận diện khuôn mặt tốt và chất lượng
 * bối cảnh/ánh sáng cao hơn FLUX.1-Kontext-dev, có giấy phép dùng thương mại.
 *
 * Cần biến môi trường GEMINI_API_KEY (lấy tại https://aistudio.google.com/apikey).
 * Giá tham khảo ~$0.039/ảnh (30$/1M output token, mỗi ảnh ~1290 token).
 *
 * Trả về data URL base64 (ảnh không lưu lên storage nào, chỉ giữ tạm trong response).
 */
export async function generateCheckinPhoto(
  originalPhoto: { mediaType: string; base64: string },
  editPrompt: string
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Thiếu GEMINI_API_KEY trong biến môi trường.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [
          { text: editPrompt },
          {
            inlineData: {
              mimeType: originalPhoto.mediaType,
              data: originalPhoto.base64,
            },
          },
        ],
      },
    ],
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    // Gemini có thể từ chối/không trả ảnh vì safety filter - lấy text giải thích nếu có
    const textPart = parts.find((p) => p.text)?.text;
    throw new Error(
      `Gemini không trả về ảnh${textPart ? `: ${textPart}` : "."}`
    );
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}