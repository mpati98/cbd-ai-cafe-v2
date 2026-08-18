import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient(process.env.HF_API_TOKEN);

/**
 * Tạo ảnh CHECK-IN dựa trên ảnh gốc của khách (giữ lại nét đặc trưng/nhận diện được),
 * chỉnh sửa/thêm bối cảnh theo prompt (yếu tố nghề nghiệp + vibe Đà Lạt) bằng
 * FLUX.1-Kontext-dev (image-to-image editing) qua Hugging Face Inference Providers.
 *
 * LƯU Ý GIẤY PHÉP: FLUX.1-Kontext-dev phát hành theo giấy phép non-commercial
 * (https://huggingface.co/black-forest-labs/FLUX.1-Kontext-dev). Đang dùng để TEST,
 * cần đánh giá lại trước khi go-live thương mại chính thức (ví dụ chuyển sang
 * FLUX.1 Kontext [pro] trả phí qua fal.ai/BFL API, có điều khoản thương mại).
 *
 * Cần biến môi trường HF_API_TOKEN, và tài khoản tạo token đó phải đã bấm "Agree"
 * điều khoản trên trang model.
 *
 * Trả về data URL base64 (ảnh không lưu lên storage nào, chỉ giữ tạm trong response).
 */
export async function generateCheckinPhoto(
  originalPhoto: { mediaType: string; base64: string },
  editPrompt: string
): Promise<string> {
  if (!process.env.HF_API_TOKEN) {
    throw new Error("Thiếu HF_API_TOKEN trong biến môi trường.");
  }

  const inputBuffer = Buffer.from(originalPhoto.base64, "base64");
  const inputBlob = new Blob([inputBuffer], { type: originalPhoto.mediaType });

  const result = await client.imageToImage({
    model: "black-forest-labs/FLUX.1-Kontext-dev",
    provider: "auto",
    inputs: inputBlob,
    parameters: {
      prompt: editPrompt,
      // Guidance mặc định của Kontext-dev (~2.5) thường vẫn giữ da/kết cấu như ảnh thật.
      // Tăng lên để model bám sát yêu cầu "vẽ lại theo phong cách illustration" mạnh hơn.
      guidance_scale: 4.5,
    },
  });

  // SDK trả về Blob cho task image-to-image
  const arrayBuffer = await result.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const contentType = result.type || "image/jpeg";

  return `data:${contentType};base64,${base64}`;
}