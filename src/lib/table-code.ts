import { randomBytes } from "crypto";

// Bỏ ký tự dễ nhầm lẫn (0/O, 1/l/I) — dù mã này chủ yếu quét qua QR, không
// gõ tay, nhưng lỡ cần đọc/gõ lại (QR hỏng, khách chụp màn hình) vẫn rõ ràng.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** Sinh mã bàn ngẫu nhiên (không đoán được) dùng trong URL QR: /order/t/{code} */
export function generateTableCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
