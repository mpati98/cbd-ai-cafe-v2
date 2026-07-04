/**
 * Minh hoạ SVG cho từng nhóm đồ uống — dùng làm ảnh nền thẻ món khi món đó
 * chưa có ảnh thật (imageId null). Giữ tông màu thương hiệu (cam/navy/nâu/latte),
 * riêng "matcha" có thêm chút xanh trà rất nhẹ vì đây là màu đặc trưng khó thay thế.
 */
export type DrinkArtVariant =
  | "latte"
  | "iced-coffee"
  | "milk-fog"
  | "cold-brew"
  | "fruit-tea"
  | "matcha"
  | "cacao";

const GRADIENTS: Record<DrinkArtVariant, [string, string]> = {
  latte: ["#2A1B10", "#5A3423"],
  "iced-coffee": ["#182652", "#3B2C1B"],
  "milk-fog": ["#241A10", "#7A4B33"],
  "cold-brew": ["#0F1936", "#22336F"],
  "fruit-tea": ["#2E2216", "#B8440A"],
  matcha: ["#1B2416", "#3B4A2E"],
  cacao: ["#140D07", "#432717"],
};

function Cup({ steam = false }: { steam?: boolean }) {
  return (
    <g>
      <path
        d="M150 140 L250 140 L242 230 Q240 250 220 250 L180 250 Q160 250 158 230 Z"
        fill="none"
        stroke="#EFE4D0"
        strokeWidth="3"
        opacity="0.9"
      />
      <path d="M250 150 Q285 150 285 175 Q285 198 250 196" fill="none" stroke="#EFE4D0" strokeWidth="3" opacity="0.9" />
      <ellipse cx="200" cy="140" rx="50" ry="8" fill="none" stroke="#EFE4D0" strokeWidth="3" opacity="0.9" />
      {steam && (
        <g stroke="#EFE4D0" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6">
          <path d="M180 120 q-8 -18 0 -30 q8 -12 0 -26" />
          <path d="M200 118 q8 -16 0 -28 q-8 -14 0 -26" />
          <path d="M220 120 q-8 -18 0 -30 q8 -12 0 -26" />
        </g>
      )}
    </g>
  );
}

function Glass({ ice = false }: { ice?: boolean }) {
  return (
    <g>
      <path d="M160 120 L240 120 L228 250 Q224 262 210 262 L190 262 Q176 262 172 250 Z" fill="none" stroke="#EFE4D0" strokeWidth="3" opacity="0.9" />
      {ice && (
        <g stroke="#EFE4D0" strokeWidth="2" opacity="0.55">
          <rect x="178" y="150" width="26" height="26" rx="4" transform="rotate(-12 191 163)" fill="none" />
          <rect x="196" y="185" width="24" height="24" rx="4" transform="rotate(10 208 197)" fill="none" />
          <rect x="172" y="195" width="20" height="20" rx="4" transform="rotate(-6 182 205)" fill="none" />
        </g>
      )}
    </g>
  );
}

function CircuitAccent() {
  return (
    <g stroke="#FF9A44" strokeWidth="2" fill="none" opacity="0.55" style={{ filter: "drop-shadow(0 0 4px rgba(255,154,68,0.6))" }}>
      <path d="M60 60 L110 60 L110 95 L150 95" />
      <circle cx="60" cy="60" r="4" fill="#FF9A44" stroke="none" />
      <circle cx="150" cy="95" r="4" fill="#FF9A44" stroke="none" />
      <path d="M330 220 L300 220 L300 250" opacity="0.4" />
    </g>
  );
}

function Sparkles() {
  return (
    <g fill="#FF9A44" opacity="0.8">
      <path d="M320 70 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" />
      <path d="M85 210 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" opacity="0.6" />
    </g>
  );
}

export default function DrinkArt({ variant, className = "" }: { variant: DrinkArtVariant; className?: string }) {
  const [from, to] = GRADIENTS[variant];

  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={`h-full w-full ${className}`}>
      <defs>
        <radialGradient id={`bg-${variant}`} cx="70%" cy="20%" r="90%">
          <stop offset="0%" stopColor={to} />
          <stop offset="100%" stopColor={from} />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#bg-${variant})`} />

      {variant === "latte" && (
        <>
          <Cup steam />
          <CircuitAccent />
        </>
      )}

      {variant === "iced-coffee" && (
        <>
          <Glass ice />
          <path d="M170 130 q30 20 60 0" stroke="#5A3423" strokeWidth="6" fill="none" opacity="0.7" />
          <Sparkles />
        </>
      )}

      {variant === "milk-fog" && (
        <>
          <Cup />
          <g stroke="#EFE4D0" strokeWidth="2" fill="none" opacity="0.35">
            <path d="M60 220 q40 -12 80 0 q40 12 80 0 q40 -12 80 0" />
            <path d="M50 245 q40 -10 80 0 q40 10 80 0 q40 -10 80 0" />
          </g>
        </>
      )}

      {variant === "cold-brew" && (
        <>
          <Glass ice />
          <g opacity="0.5">
            <rect x="160" y="150" width="80" height="14" fill="#5E72C4" opacity="0.4" />
            <rect x="160" y="185" width="80" height="14" fill="#3B4FA0" opacity="0.4" />
          </g>
          <CircuitAccent />
        </>
      )}

      {variant === "fruit-tea" && (
        <>
          <Glass ice />
          <circle cx="290" cy="90" r="22" fill="none" stroke="#FF9A44" strokeWidth="3" opacity="0.85" />
          <g stroke="#FF9A44" strokeWidth="1.4" opacity="0.7">
            <path d="M290 68 L290 112" />
            <path d="M269 90 L311 90" />
            <path d="M275 76 L305 104" />
            <path d="M275 104 L305 76" />
          </g>
          <path d="M110 90 q10 -18 26 -10 q-4 18 -26 10z" fill="#FF9A44" opacity="0.55" />
          <Sparkles />
        </>
      )}

      {variant === "matcha" && (
        <>
          <Glass ice />
          <path
            d="M175 145 q10 10 0 20 q-10 10 0 20 q10 10 0 20"
            stroke="#9CB68A"
            strokeWidth="3"
            fill="none"
            opacity="0.7"
          />
          <circle cx="200" cy="90" r="16" fill="none" stroke="#9CB68A" strokeWidth="2.5" opacity="0.6" />
        </>
      )}

      {variant === "cacao" && (
        <>
          <Cup steam />
          <g fill="#FF9A44" opacity="0.85">
            <circle cx="90" cy="70" r="2.5" />
            <circle cx="320" cy="100" r="2" />
            <circle cx="270" cy="55" r="1.6" />
            <circle cx="130" cy="200" r="1.8" />
          </g>
          <Sparkles />
        </>
      )}
    </svg>
  );
}
