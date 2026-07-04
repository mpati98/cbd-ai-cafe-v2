export default function Divider({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1200 48"
      preserveAspectRatio="none"
      className={`block h-8 w-full sm:h-12 ${flip ? "scale-x-[-1]" : ""}`}
    >
      <rect width="1200" height="48" fill="#1B130B" />
      <path
        d="M0 24 L120 24 L150 8 L180 40 L210 24 L1200 24"
        fill="none"
        stroke="#EE7211"
        strokeWidth="1.4"
        opacity="0.6"
        style={{ filter: "drop-shadow(0 0 4px rgba(238,114,17,0.6))" }}
      />
      <path
        d="M1200 24 Q1050 24 1000 36 Q950 48 900 36 Q860 26 830 24"
        fill="none"
        stroke="#A97A54"
        strokeWidth="1.6"
        opacity="0.7"
      />
    </svg>
  );
}
