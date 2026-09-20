import sharp from "sharp";

// Kích thước ảnh in lưu niệm 4x6 inch chuẩn @ 300 DPI (tỉ lệ 2:3, khớp đúng
// tỉ lệ khung ảnh gốc nên không bị méo khi cover-crop).
const PRINT_WIDTH = 1200;
const PRINT_HEIGHT = 1800;
const PRINT_DPI = 300;
// Trần chiều cao khung ghi chú (~half ảnh) — nội dung tối đa vẫn nằm gọn dưới mức này.
const MAX_CARD_HEIGHT = 960;

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
 * Ước lượng độ rộng 1 ký tự theo em (Noto Sans, có dấu tiếng Việt). SVG tĩnh
 * không có font metrics thật nên phân loại thô: chữ HOA rộng hơn chữ thường
 * ~35% — đếm số ký tự trơn (như bản đầu) làm dòng toàn chữ hoa tràn khỏi ảnh.
 * Hệ số đã đối chiếu với ảnh render thật; chữ đậm rộng hơn ~8%.
 */
function charWidthEm(ch: string, bold: boolean): number {
  let w: number;
  if (ch === " ") w = 0.26;
  else if (/\p{Lu}/u.test(ch)) w = 0.68;
  else if (/\p{Ll}/u.test(ch)) w = 0.5;
  else if (/\p{N}/u.test(ch)) w = 0.56;
  else w = 0.42; // dấu câu, ký hiệu
  return bold ? w * 1.08 : w;
}

function measureText(text: string, size: number, bold: boolean): number {
  let em = 0;
  for (const ch of text.normalize("NFC")) em += charWidthEm(ch, bold);
  return em * size;
}

/**
 * Bọc text thành tối đa `maxLines` dòng, mỗi dòng không quá `maxWidth` px (theo
 * ước lượng ở trên). Còn chữ chưa hiển thị hết thì cắt bớt + thêm "…" ở dòng cuối.
 */
function wrapText(text: string, maxWidth: number, maxLines: number, size: number, bold: boolean): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const fits = (line: string) => measureText(line, size, bold) <= maxWidth;
  const stripTail = (line: string) => line.replace(/[.,;:…]+$/, "");

  const lines: string[] = [];
  let current = "";
  let i = 0;
  for (; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (!current || fits(candidate)) {
      current = candidate;
      continue;
    }
    if (lines.length === maxLines - 1) break; // hết dòng cho phép
    lines.push(current);
    current = words[i];
  }
  lines.push(current);

  if (i < words.length) {
    let last = stripTail(lines[lines.length - 1]);
    while (last.includes(" ") && !fits(`${last}…`)) last = stripTail(last.slice(0, last.lastIndexOf(" ")));
    lines[lines.length - 1] = `${last}…`;
  }

  // Chốt an toàn: 1 từ đơn dài quá 1 dòng thì cắt ký tự — không bao giờ để tràn mép ảnh.
  return lines.map((line) => {
    let out = line;
    while (!fits(out) && out.length > 2) out = `${stripTail(out.slice(0, -2))}…`;
    return out;
  });
}

// Khung ghi chú: NEO SÁT ĐÁY ảnh, nền đặc màu (không phải gradient mờ dần) để
// chữ luôn rõ bất kể ảnh nền sáng hay tối. Chiều cao tự tính theo số dòng thực
// tế (nội dung ngắn thì khung thấp, đỡ che ảnh) — chỉ có trần MAX_CARD_HEIGHT.
const CARD_RADIUS = 48;
const CARD_FILL = "#0e1015";
const CARD_OPACITY = 0.9;
const CARD_PAD_TOP = 60;
const CARD_PAD_BOTTOM = 60;
const CARD_PAD_X = 64;

// Cỡ chữ (px @300dpi trên khổ 4x6"). Đã tăng ×1.5 so với bản đầu (24/48/28) vì
// chữ 28px chỉ ~6.7pt khi in ra — quá nhỏ để đọc.
const LABEL_SIZE = 36;
const TITLE_SIZE = 72;
const BODY_SIZE = 42;

// Chừa biên an toàn ~4% để chênh lệch nhỏ giữa ước lượng và font thật không làm tràn.
const LINE_WIDTH_SAFETY = 0.96;

const MAX_LINES_TITLE = 2;
const MAX_LINES_BODY = 2;

type TextBlock = {
  lines: string[];
  size: number;
  weight: number;
  fill: string;
  lineHeight: number;
  gapAfter: number;
  letterSpacing?: number;
};

/** Xây SVG overlay: khung ghi chú nền đặc, bo góc trên, viền vàng, neo cố định đáy ảnh. */
function buildOverlaySvg(note: CareerNote): string {
  const lineWidth = (PRINT_WIDTH - CARD_PAD_X * 2) * LINE_WIDTH_SAFETY;

  const label = (text: string): TextBlock => ({
    lines: [text.toUpperCase()],
    size: LABEL_SIZE,
    weight: 700,
    fill: "#fcd34d",
    lineHeight: Math.round(LABEL_SIZE * 1.25),
    gapAfter: 6,
    letterSpacing: 2,
  });
  const body = (text: string, fill: string): TextBlock => ({
    lines: wrapText(text, lineWidth, MAX_LINES_BODY, BODY_SIZE, false),
    size: BODY_SIZE,
    weight: 400,
    fill,
    lineHeight: Math.round(BODY_SIZE * 1.36),
    gapAfter: 26,
  });

  const blocks: TextBlock[] = [
    label("Nghề nghiệp của bạn"),
    {
      lines: wrapText(note.careerName, lineWidth, MAX_LINES_TITLE, TITLE_SIZE, true),
      size: TITLE_SIZE,
      weight: 800,
      fill: "#fcd34d",
      lineHeight: Math.round(TITLE_SIZE * 1.15),
      gapAfter: 22,
    },
    body(note.overview, "#ffffff"),
    label("Điều kiện cần"),
    body(note.conditions, "#e8e8e8"),
    label("Thói quen nên rèn luyện"),
    { ...body(note.habits, "#e8e8e8"), gapAfter: 0 },
  ];

  // Lần 1: đo — tính vị trí tương đối của từng dòng để biết tổng chiều cao khung.
  const placed: { text: string; block: TextBlock; relY: number }[] = [];
  let y = CARD_PAD_TOP;
  for (const block of blocks) {
    for (const line of block.lines) {
      y += block.size; // baseline = đỉnh dòng + cỡ chữ
      placed.push({ text: line, block, relY: y });
      y += block.lineHeight - block.size;
    }
    y += block.gapAfter;
  }
  const cardHeight = Math.min(y + CARD_PAD_BOTTOM, MAX_CARD_HEIGHT);
  const cardTop = PRINT_HEIGHT - cardHeight;

  // Lần 2: xuất text node ở toạ độ tuyệt đối.
  const textNodes = placed.map(({ text, block, relY }) => {
    const spacing = block.letterSpacing ? ` letter-spacing="${block.letterSpacing}"` : "";
    return `<text x="${CARD_PAD_X}" y="${cardTop + relY}" font-family="Noto Sans, sans-serif" font-size="${block.size}" font-weight="${block.weight}"${spacing} fill="${block.fill}">${escapeXml(text)}</text>`;
  });

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
    <path d="${cardPath}" fill="${CARD_FILL}" fill-opacity="${CARD_OPACITY}" stroke="#fcd34d" stroke-width="5" stroke-opacity="0.9" />
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
