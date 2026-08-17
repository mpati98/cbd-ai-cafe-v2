const HF_MODEL_URL =
  "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

const STYLE_SUFFIX =
  "digital illustration, minimalist dreamy aesthetic, warm amber/gold and cool cyan color palette on dark background, symbolic, no human faces";

/**
 * Tạo ảnh minh hoạ mang tính biểu tượng (không có mặt người) qua Hugging Face
 * Inference API cho model black-forest-labs/FLUX.1-schnell.
 * Trả về data URL base64 (ảnh không được lưu lên storage nào, chỉ giữ tạm trong response).
 *
 * Cần biến môi trường HF_API_TOKEN (Hugging Face access token, quyền "Read" là đủ).
 * Model FLUX.1-schnell yêu cầu đã bấm "Agree" điều khoản trên trang model
 * (https://huggingface.co/black-forest-labs/FLUX.1-schnell) bằng tài khoản tạo token đó.
 */
export async function generateIllustration(prompt: string): Promise<string> {
  const token = process.env.HF_HUB_TOKEN;
  if (!token) {
    throw new Error("Thiếu HF_HUB_TOKEN trong biến môi trường.");
  }

  const fullPrompt = `${prompt}, ${STYLE_SUFFIX}`;

  const response = await fetchWithModelWarmupRetry(fullPrompt, token);

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Hugging Face API lỗi (${response.status}): ${errText || response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return `data:${contentType};base64,${base64}`;
}

/**
 * Model HF có thể đang "cold" (chưa load lên server) -> trả 503 kèm estimated_time.
 * Retry vài lần với khoảng chờ hợp lý thay vì fail ngay.
 */
async function fetchWithModelWarmupRetry(
  prompt: string,
  token: string,
  maxAttempts = 3
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(HF_MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (response.status !== 503) {
      return response;
    }

    lastResponse = response;
    const data = await response.json().catch(() => ({}));
    const waitMs = Math.min((data?.estimated_time ?? 5) * 1000, 15000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  return lastResponse as Response;
}