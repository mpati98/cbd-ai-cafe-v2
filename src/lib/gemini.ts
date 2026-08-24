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

// Sentinel Gemini phải trả về nguyên văn khi audio không có lời nói thật
// (im lặng / chỉ tiếng ồn nền) — dùng để phân biệt với 1 câu transcribe thật.
const NO_SPEECH_SENTINEL = "[NO_SPEECH]";

function buildTranscribePrompt(hint?: string): string {
  // CẢNH BÁO: đã test thực tế thấy nếu chỉ đưa hint như 1 gợi ý "có thể xuất
  // hiện", Gemini có xu hướng LẤY LUÔN 1 TÊN TRONG HINT LÀM CÂU TRẢ LỜI khi
  // audio thật ra là im lặng (vd hint "Cold Brew, Latte" + audio im lặng ->
  // bịa ra "Cho mình một ly Cold Brew") — hint vô tình phản tác dụng, biến
  // thành hallucination kiểu mới thay vì chỉ giúp đánh vần đúng dấu. Phải nói
  // RÕ RÀNG NHIỀU LẦN rằng đây chỉ là tài liệu tham khảo chính tả, không phải
  // gợi ý nội dung, và nhắc lại điều kiện [NO_SPEECH] áp dụng bất kể danh sách
  // này — đặt yêu cầu chống bịa NGAY SAU danh sách (cuối prompt) để có trọng
  // số cao hơn, vì đặt ở đầu (trước hint) không đủ để ngăn hành vi này.
  const hintBlock = hint
    ? `\n\nReference spelling list (Vietnamese drink names that might be spoken, for correct diacritics ONLY): ${hint}\n` +
      "This list is NOT a suggestion of what was said. Do NOT pick a name from this list unless you actually hear it clearly spoken in the audio. " +
      `If the audio is silent, unintelligible, or only background noise, you MUST respond ${NO_SPEECH_SENTINEL} — even though this list exists. Never fabricate an order from this list.`
    : "";
  return (
    "You are a strict speech-to-text transcriber, not an assistant completing an order. " +
    "Transcribe ONLY the exact words spoken in this audio, in Vietnamese, verbatim — like a court stenographer, not like someone filling in a plausible coffee order. " +
    "Do NOT add words, quantities, sizes, or modifiers (e.g. 'ít đường', 'size L', 'nóng') that were not actually spoken. " +
    "Do NOT substitute a different (even similar-sounding or more common) menu item for what was actually said. " +
    "Do NOT complete or 'clean up' a partial/mumbled utterance into a full sentence — if it's partial or unclear, transcribe only the part you can actually hear. " +
    "If you are not confident about a word, transcribe your best literal phonetic guess — never silently replace it with a different, more sensible-sounding word. " +
    "no translation, no punctuation guessing beyond what's spoken, no commentary or description of the audio. " +
    `If there is no clear speech at all (silence, only background noise/music, or completely unintelligible), respond with EXACTLY: ${NO_SPEECH_SENTINEL}` +
    hintBlock
  );
}

/**
 * Nhận diện giọng nói (STT) qua Gemini — thay cho Groq/whisper-large-v3.
 * Lý do đổi: Whisper (mọi biến thể, kể cả hosted qua Groq) có xu hướng "bịa"
 * (hallucinate) câu hoàn toàn không liên quan khi audio không có lời nói rõ
 * ràng (im lặng/tiếng ồn quán), do bị train nhiều trên phụ đề YouTube tự động
 * — chặn bằng blocklist từ khoá là chữa cháy, không triệt để. Test thực tế
 * cho thấy Gemini KHÔNG lặp lại lỗi này trên cùng bộ audio test (im lặng,
 * tiếng ồn nền, giọng nói thật) — kiến trúc/dữ liệu train khác Whisper nên
 * không có cùng thiên kiến "outro video". Trả về `null` nếu không phát hiện
 * lời nói thật (audio im lặng/nhiễu) — caller nên coi như "chưa nghe rõ".
 */
export async function transcribeAudio(audio: { base64: string; mimeType: string }, hint?: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Thiếu GEMINI_API_KEY trong biến môi trường.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: buildTranscribePrompt(hint) },
          { inlineData: { mimeType: audio.mimeType, data: audio.base64 } },
        ],
      },
    ],
    // ĐÃ THỬ temperature=0 (kỳ vọng giảm bịa vì đây là tác vụ transcribe chỉ
    // có 1 đáp án "đúng", không phải sinh văn bản sáng tạo) — nhưng test thực
    // tế cho kết quả TỆ HƠN: false-reject tăng vọt (báo "không nghe rõ" dù
    // audio rõ ràng có tên món như "Cappuccino", "Espresso") mà vẫn còn tình
    // trạng đổi nhầm sang món khác trong hint. Bỏ lại temperature mặc định vì
    // đo được là cấu hình cho kết quả tốt hơn trên cùng bộ test.
  });

  const text = (response.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text || text.toUpperCase().includes(NO_SPEECH_SENTINEL)) return null;
  return text;
}