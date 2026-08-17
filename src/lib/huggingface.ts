import { InferenceClient } from "@huggingface/inference";

const STYLE_SUFFIX =
  "digital illustration, minimalist dreamy aesthetic, warm amber/gold and cool cyan color palette on dark background, symbolic, no human faces";

const client = new InferenceClient(process.env.HF_API_TOKEN);

/**
 * Tạo ảnh minh hoạ mang tính biểu tượng (không có mặt người) qua Hugging Face
 * Inference Providers cho model black-forest-labs/FLUX.1-schnell.
 *
 * Lưu ý: HF đã ngừng endpoint cũ "api-inference.huggingface.co" (trả lỗi 410/ENOTFOUND).
 * Endpoint mới là hệ thống "Inference Providers" (router.huggingface.co), nơi model được
 * host bởi các provider bên thứ 3 (fal-ai, replicate, together...). SDK @huggingface/inference
 * tự chọn provider phù hợp (provider: "auto") nên không cần tự dựng URL.
 *
 * Trả về data URL base64 (ảnh không lưu lên storage nào, chỉ giữ tạm trong response).
 *
 * Cần biến môi trường HF_API_TOKEN (Hugging Face access token, quyền "Read" là đủ).
 * Model FLUX.1-schnell yêu cầu đã bấm "Agree" điều khoản trên trang model
 * (https://huggingface.co/black-forest-labs/FLUX.1-schnell) bằng tài khoản tạo token đó.
 */
export async function generateIllustration(prompt: string): Promise<string> {
  if (!process.env.HF_HUB_TOKEN) {
    throw new Error("Thiếu HF_API_TOKEN trong biến môi trường.");
  }

  const fullPrompt = `${prompt}, ${STYLE_SUFFIX}`;

  const blob = await client.textToImage(
    {
      model: "black-forest-labs/FLUX.1-schnell",
      provider: "auto",
      inputs: fullPrompt,
    },
    { outputType: "blob" }
  );

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const contentType = blob.type || "image/jpeg";

  return `data:${contentType};base64,${base64}`;
}