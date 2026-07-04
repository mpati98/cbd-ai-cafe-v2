import { TAG_AXES } from "@/lib/tags";
import { formatVnd } from "@/lib/format";

export type ChatMenuItem = {
  id: string;
  name: string;
  description: string;
  priceVnd: number;
  isBestSeller: boolean;
  tags: string[];
};

export type ChatMessage = { id: string; from: "bot" | "user"; text: string };
export type QuickReply = { label: string; value: string };

export type ChatStep =
  | "greeting"
  | "ask_direct"
  | "ask_direct_disambiguate"
  | "ask_q0"
  | "ask_q1"
  | "ask_q2"
  | "result"
  | "closed";

export type ChatState = {
  messages: ChatMessage[];
  quickReplies: QuickReply[];
  step: ChatStep;
  answers: Record<string, string>;
  highlightedItemId: string | null;
  /** Side-effect for the component to apply once, then discard. */
  pendingEffect: { type: "add_to_cart"; itemId: string } | null;
};

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `msg_${Date.now()}_${msgCounter}`;
}

function bot(text: string): ChatMessage {
  return { id: nextId(), from: "bot", text };
}
function user(text: string): ChatMessage {
  return { id: nextId(), from: "user", text };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * So khớp câu nói/gõ tự nhiên (vd "đậm đà", "cho tôi vị đậm") với nhãn 1 lựa
 * chọn (vd "Đậm đà ☕") — bỏ emoji/dấu câu, không phân biệt dấu tiếng Việt,
 * khớp nếu 1 trong 2 chuỗi chứa chuỗi còn lại. Cố tình khoan dung (không cần
 * khớp tuyệt đối) vì giọng nói hiếm khi ra đúng 100% nhãn hiển thị.
 */
function matchesOptionLabel(input: string, label: string): boolean {
  // Nhãn có thể chứa "/" để nối 2 cách gọi (vd "Đá / lạnh", "Cà phê / trà
  // truyền thống") — tách theo "/" và so khớp với TỪNG phần riêng, thay vì
  // xoá "/" rồi nối liền thành 1 câu dễ sai (mất nghĩa của phép "hoặc").
  const alternatives = label
    .replace(/[^\p{L}\p{N}\s/]/gu, "")
    .split("/")
    .map((s) => normalize(s.trim()))
    .filter(Boolean);
  const a = normalize(input);
  if (!a) return false;
  return alternatives.some((b) => a === b || a.includes(b) || b.includes(a));
}

export function searchMenuByText(items: ChatMenuItem[], query: string): ChatMenuItem[] {
  const q = normalize(query);
  if (!q) return [];

  const byName = items.filter((i) => normalize(i.name).includes(q) || q.includes(normalize(i.name)));
  if (byName.length) return byName;

  const byDescription = items.filter((i) => normalize(i.description).includes(q));
  if (byDescription.length) return byDescription;

  // Fallback mờ (fuzzy): nhận diện giọng nói hay lệch 1-2 ký tự (mất dấu,
  // nhận nhầm âm gần giống). So khớp THEO TỪNG TỪ — mỗi từ trong câu hỏi
  // phải khớp gần đúng (Levenshtein nhỏ) với ít nhất 1 từ trong tên món, để
  // câu hỏi nhiều từ (vd "cot brew") vẫn khớp đúng thay vì so cả câu 1 lần.
  const fuzzy = items.filter((item) => fuzzyWordsMatch(q, normalize(item.name)));
  return fuzzy;
}

/**
 * So khớp mờ theo từng từ — ưu tiên KHÔNG khớp sai hơn là khớp rộng (gợi ý
 * nhầm món còn tệ hơn báo "không tìm thấy"). Với câu nhiều từ, phần lớn từ
 * phải khớp CHÍNH XÁC (sau chuẩn hoá dấu) — chỉ cho phép 1 số ít từ "gần
 * giống" (Levenshtein nhỏ), tránh trường hợp nhiều từ ngắn cùng tình cờ
 * "gần giống" 1 món hoàn toàn không liên quan.
 */
function fuzzyWordsMatch(query: string, normalizedName: string): boolean {
  const qWords = query.split(/\s+/).filter(Boolean);
  const nameWords = normalizedName.split(/\s+/).filter(Boolean);
  if (!qWords.length) return false;

  const wordThreshold = (len: number) => (len <= 3 ? 1 : len <= 6 ? 2 : 3);

  if (qWords.length === 1) {
    const qw = qWords[0];
    return nameWords.some((nw) => levenshtein(qw, nw) <= wordThreshold(qw.length));
  }

  let exactCount = 0;
  for (const qw of qWords) {
    if (nameWords.includes(qw)) {
      exactCount++;
      continue;
    }
    const fuzzyOk = nameWords.some((nw) => levenshtein(qw, nw) <= wordThreshold(qw.length));
    if (!fuzzyOk) return false; // có từ không khớp gì cả -> chắc không phải món này
  }
  return exactCount >= Math.ceil(qWords.length / 2);
}

/** Khoảng cách Levenshtein (số ký tự cần sửa để biến chuỗi a thành b). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

export function recommendByAnswers(items: ChatMenuItem[], answers: Record<string, string>): ChatMenuItem | null {
  if (!items.length) return null;
  const wanted = Object.values(answers).filter(Boolean);
  const scored = items.map((item) => ({
    item,
    score: wanted.reduce((acc, t) => acc + (item.tags?.includes(t) ? 1 : 0), 0),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.item.isBestSeller !== b.item.isBestSeller) return a.item.isBestSeller ? -1 : 1;
    return 0;
  });
  return scored[0]?.item ?? null;
}

const GREETING_REPLIES: QuickReply[] = [
  { label: "Mình biết muốn uống gì rồi", value: "known" },
  { label: "Gợi ý giúp mình", value: "suggest" },
];

const RESULT_REPLIES: QuickReply[] = [
  { label: "Thêm vào giỏ hàng 🛒", value: "addcart" },
  { label: "Gợi ý món khác", value: "more" },
  { label: "Không, cảm ơn", value: "done" },
];

const POST_ADD_REPLIES: QuickReply[] = [
  { label: "Gợi ý món khác", value: "more" },
  { label: "Không, cảm ơn", value: "done" },
];

const RESTART_REPLIES: QuickReply[] = [{ label: "Bắt đầu lại", value: "restart" }];

export function initialChatState(): ChatState {
  return {
    messages: [
      bot("Chào bạn! Mình là CBD Robot 🤖☕"),
      bot("Bạn đã biết muốn uống gì chưa, hay để mình gợi ý cho bạn nhé?"),
    ],
    quickReplies: GREETING_REPLIES,
    step: "greeting",
    answers: {},
    highlightedItemId: null,
    pendingEffect: null,
  };
}

function askAxis(state: ChatState, axisIndex: number): ChatState {
  const axis = TAG_AXES[axisIndex];
  return {
    ...state,
    messages: [...state.messages, bot(axis.question)],
    quickReplies: axis.options.map((o) => ({ label: o.label, value: o.value })),
    step: (`ask_q${axisIndex}` as ChatStep),
    highlightedItemId: null,
  };
}

function toDirectSearch(state: ChatState, withPrompt: boolean): ChatState {
  return {
    ...state,
    messages: withPrompt
      ? [...state.messages, bot('Bạn muốn uống gì? Gõ tên món vào ô bên dưới nhé, ví dụ "cold brew" hoặc "trà đào".')]
      : state.messages,
    quickReplies: [],
    step: "ask_direct",
    highlightedItemId: null,
  };
}

function toClosed(state: ChatState): ChatState {
  return {
    ...state,
    messages: [...state.messages, bot("Cảm ơn bạn đã ghé CBD AI Cafe! 😊 Cần gì cứ nhắn mình nhé.")],
    quickReplies: RESTART_REPLIES,
    step: "closed",
    highlightedItemId: null,
  };
}

function showResult(state: ChatState, item: ChatMenuItem | null): ChatState {
  if (!item) {
    return {
      ...state,
      messages: [
        ...state.messages,
        bot("Xin lỗi, mình chưa tìm được món phù hợp 😅 Bạn có muốn mình gợi ý theo cách khác không?"),
      ],
      quickReplies: [{ label: "Gợi ý giúp mình", value: "suggest" }],
      step: "ask_direct",
      highlightedItemId: null,
    };
  }
  return {
    ...state,
    messages: [
      ...state.messages,
      bot(
        `${item.isBestSeller ? "Đây là món best-seller của tụi mình" : "Mình nghĩ bạn sẽ thích món này"}: **${item.name}** 🎉`
      ),
      bot(`${item.description} Giá ${formatVnd(item.priceVnd)}.`),
      bot("Bạn có cần mình giúp gì thêm không?"),
    ],
    quickReplies: RESULT_REPLIES,
    step: "result",
    highlightedItemId: item.id,
  };
}

function runSearch(state: ChatState, rawQuery: string, items: ChatMenuItem[]): ChatState {
  const matches = searchMenuByText(items, rawQuery);
  if (matches.length === 0) {
    return {
      ...state,
      messages: [
        ...state.messages,
        bot(`Mình chưa tìm thấy món "${rawQuery}" trong thực đơn 😅 Bạn thử gõ lại tên khác, hoặc để mình gợi ý nhé!`),
      ],
      quickReplies: [{ label: "Gợi ý giúp mình", value: "suggest" }],
      step: "ask_direct",
      highlightedItemId: null,
    };
  }
  if (matches.length === 1) {
    return showResult(state, matches[0]);
  }
  return {
    ...state,
    messages: [...state.messages, bot("Mình tìm thấy vài món phù hợp, bạn chọn giúp mình nhé:")],
    quickReplies: matches.slice(0, 5).map((m) => ({ label: m.name, value: `pick:${m.id}` })),
    step: "ask_direct_disambiguate",
    highlightedItemId: null,
  };
}

function nudge(state: ChatState, text: string): ChatState {
  return { ...state, messages: [...state.messages, bot(text)] };
}

/**
 * Bộ não của order-chatbot — hàm thuần (pure function): nhận state hiện tại +
 * input của khách (token từ quick-reply hoặc text tự do), trả về state mới.
 * Component chỉ việc setState(newState) và xử lý `pendingEffect` nếu có.
 */
export function handleUserInput(state: ChatState, rawValue: string, items: ChatMenuItem[]): ChatState {
  const value = rawValue.trim();
  if (!value) return state;

  // Nhãn hiển thị bong bóng tin nhắn của khách: nếu value khớp 1 quick reply
  // đang hiển thị thì dùng label thân thiện, ngược lại dùng nguyên văn (free text).
  const matchedReply = state.quickReplies.find((r) => r.value === value);
  const next: ChatState = {
    ...state,
    messages: [...state.messages, user(matchedReply ? matchedReply.label : value)],
    quickReplies: [],
    pendingEffect: null,
  };

  switch (next.step) {
    case "greeting": {
      if (value === "known") return toDirectSearch(next, true);
      if (value === "suggest") return askAxis({ ...next, answers: {} }, 0);
      return runSearch(next, value, items);
    }

    case "ask_direct": {
      if (value === "suggest") return askAxis({ ...next, answers: {} }, 0);
      return runSearch(next, value, items);
    }

    case "ask_direct_disambiguate": {
      if (value.startsWith("pick:")) {
        const item = items.find((i) => i.id === value.slice(5)) ?? null;
        return showResult(next, item);
      }
      if (value === "suggest") return askAxis({ ...next, answers: {} }, 0);
      return runSearch(next, value, items);
    }

    case "ask_q0":
    case "ask_q1":
    case "ask_q2": {
      const axisIndex = Number(next.step.slice(-1));
      const axis = TAG_AXES[axisIndex];
      // Khớp cả khi bấm nút (value = mã nội bộ, vd "dam") LẪN khi gõ/nói tự
      // nhiên theo đúng nhãn (vd "đậm đà") — quan trọng cho voice input, vì
      // giọng nói không thể "gửi" mã nội bộ, chỉ nói ra được câu tự nhiên.
      const chosen = axis.options.find((o) => o.value === value || matchesOptionLabel(value, o.label));
      if (!chosen) {
        return askAxis(nudge(next, "Bạn chọn 1 trong 2 gợi ý bên dưới giúp mình nhé 🙏"), axisIndex);
      }
      const answers = { ...next.answers, [axis.key]: chosen.value };
      if (axisIndex + 1 < TAG_AXES.length) {
        return askAxis({ ...next, answers }, axisIndex + 1);
      }
      return showResult({ ...next, answers }, recommendByAnswers(items, answers));
    }

    case "result": {
      if (value === "addcart" && next.highlightedItemId) {
        const item = items.find((i) => i.id === next.highlightedItemId);
        return {
          ...next,
          messages: [
            ...next.messages,
            bot(`Đã thêm ${item ? `**${item.name}**` : "món này"} vào giỏ hàng của bạn! 🎉`),
            bot("Bạn có cần mình giúp gì thêm không?"),
          ],
          quickReplies: POST_ADD_REPLIES,
          pendingEffect: { type: "add_to_cart", itemId: next.highlightedItemId },
        };
      }
      if (value === "more") return askAxis({ ...next, answers: {} }, 0);
      if (value === "done") return toClosed(next);
      return runSearch(next, value, items);
    }

    case "closed": {
      if (value === "restart") return initialChatState();
      return runSearch(next, value, items);
    }

    default:
      return next;
  }
}
