import sharp from "sharp";

// Kích thước ảnh in lưu niệm 4x6 inch chuẩn @ 300 DPI (tỉ lệ 2:3, khớp đúng
// tỉ lệ khung ảnh gốc nên không bị méo khi cover-crop).
const PRINT_WIDTH = 1200;
const PRINT_HEIGHT = 1800;
const PRINT_DPI = 300;

export interface CareerNote {
  careerName: string;
  /** Ghi chú phổ quát ngắn về nghề nghiệp (1-2 câu) */
  overview: string;
  /** Điều kiện/tố chất cần có để theo nghề này */
  conditions: string;
  /** Thói quen nên rèn luyện để hướng đến nghề này */
  habits: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Bọc text thành tối đa `maxLines` dòng, mỗi dòng tối đa `maxCharsPerLine` ký
 * tự. Chỉ là ước lượng theo số ký tự (không có font metrics thật vì render
 * qua SVG tĩnh) - đủ dùng cho text ngắn hiển thị trên ảnh, không cần chính xác
 * tuyệt đối. Cắt bớt + thêm "…" nếu còn từ chưa hiển thị hết.
 */
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);

  const shownWordCount = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (shownWordCount < words.length && lines.length > 0) {
    const lastIdx = lines.length - 1;
    lines[lastIdx] = lines[lastIdx].replace(/[.,;:…]+$/, "") + "…";
  }

  return lines;
}

// Khung ghi chú: chiều cao CỐ ĐỊNH, neo sát đáy ảnh - nền đặc màu (không phải
// gradient mờ dần) để chữ luôn rõ ràng bất kể ảnh nền bên dưới sáng hay tối.
const CARD_HEIGHT = 680;
const CARD_RADIUS = 40;
const CARD_FILL = "#0e1015";
const CARD_OPACITY = 0.9;

/** Xây SVG overlay: khung ghi chú nền đặc, bo góc trên, viền vàng, neo cố định đáy ảnh. */
function buildOverlaySvg(note: CareerNote): string {
  const paddingX = 56;
  const contentWidth = PRINT_WIDTH - paddingX * 2;
  const avgCharWidthFactor = 0.54; // ước lượng độ rộng ký tự trung bình (Noto Sans, có dấu)

  const labelSize = 24;
  const titleSize = 48;
  const bodySize = 28;
  const bodyLineHeight = 38;

  const maxCharsTitle = Math.floor(contentWidth / (titleSize * avgCharWidthFactor));
  const maxCharsBody = Math.floor(contentWidth / (bodySize * avgCharWidthFactor));

  const titleLines = wrapText(note.careerName, maxCharsTitle, 2);
  const overviewLines = wrapText(note.overview, maxCharsBody, 2);
  const conditionLines = wrapText(note.conditions, maxCharsBody, 2);
  const habitLines = wrapText(note.habits, maxCharsBody, 2);

  const cardTop = PRINT_HEIGHT - CARD_HEIGHT;

  let y = cardTop + 76;
  const textNodes: string[] = [];

  function addLabel(text: string) {
    textNodes.push(
      `<text x="${paddingX}" y="${y}" font-family="Noto Sans, sans-serif" font-size="${labelSize}" font-weight="700" letter-spacing="1.5" fill="#fcd34d">${escapeXml(text.toUpperCase())}</text>`
    );
    y += labelSize + 14;
  }

  function addLines(lines: string[], size: number, weight: number, fill: string, lineHeight: number) {
    for (const line of lines) {
      textNodes.push(
        `<text x="${paddingX}" y="${y}" font-family="Noto Sans, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`
      );
      y += lineHeight;
    }
    y += 12;
  }

  addLabel("Nghề nghiệp của bạn");
  addLines(titleLines, titleSize, 800, "#fcd34d", titleSize + 8);
  addLines(overviewLines, bodySize, 400, "#ffffff", bodyLineHeight);
  addLabel("Điều kiện cần");
  addLines(conditionLines, bodySize, 400, "#e8e8e8", bodyLineHeight);
  addLabel("Thói quen nên rèn luyện");
  addLines(habitLines, bodySize, 400, "#e8e8e8", bodyLineHeight);

  // Path bo góc trên (rounded-top card), đáy phẳng khớp mép ảnh - viền vàng
  // mảnh phía trên để tạo cảm giác "khung" tách biệt rõ với ảnh phía trên.
  const cardPath = `M0,${cardTop + CARD_RADIUS}
    Q0,${cardTop} ${CARD_RADIUS},${cardTop}
    L${PRINT_WIDTH - CARD_RADIUS},${cardTop}
    Q${PRINT_WIDTH},${cardTop} ${PRINT_WIDTH},${cardTop + CARD_RADIUS}
    L${PRINT_WIDTH},${PRINT_HEIGHT}
    L0,${PRINT_HEIGHT}
    Z`;

  return `<svg width="${PRINT_WIDTH}" height="${PRINT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <path d="${cardPath}" fill="${CARD_FILL}" fill-opacity="${CARD_OPACITY}" stroke="#fcd34d" stroke-width="4" stroke-opacity="0.9" />
    ${textNodes.join("\n    ")}
  </svg>`;
}

/**
 * Ghép ảnh check-in gốc (do Gemini sinh ra) thành ảnh in lưu niệm chuẩn kích
 * thước 4x6 inch @ 300 DPI, có ô ghi chú nghề nghiệp (mô tả chung, điều kiện
 * cần, thói quen nên rèn luyện) đè phía dưới ảnh.
 */
export async function composePrintPhoto(
  photo: { mediaType: string; base64: string },
  note: CareerNote
): Promise<{ mimeType: string; base64: string }> {
  const inputBuffer = Buffer.from(photo.base64, "base64");
  const overlaySvg = buildOverlaySvg(note);

  const outputBuffer = await sharp(inputBuffer)
    .rotate() // tôn trọng EXIF orientation nếu có
    .resize(PRINT_WIDTH, PRINT_HEIGHT, { fit: "cover", position: "attention" })
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .withMetadata({ density: PRINT_DPI })
    .jpeg({ quality: 92 })
    .toBuffer();

  return { mimeType: "image/jpeg", base64: outputBuffer.toString("base64") };
}
