"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { imageUrl } from "@/lib/media";

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  imageId?: string | null;
};

const DECOR = [
  // 0: circuit branch (Cà phê)
  <svg key="d0" viewBox="0 0 600 600" className="h-auto w-[52%]" style={{ position: "absolute", right: "-6%", top: "6%" }}>
    <g fill="none" stroke="#EE7211" strokeWidth="2.2" opacity="0.6" style={{ filter: "drop-shadow(0 0 6px rgba(238,114,17,0.55))" }}>
      <path d="M40 60 L160 60 L160 140 L260 140" />
      <circle cx="40" cy="60" r="5" fill="#FF9A44" stroke="none" />
      <circle cx="160" cy="140" r="5" fill="#FF9A44" stroke="none" />
      <path d="M60 220 L200 220 L200 320 L340 320 L340 260" />
      <circle cx="60" cy="220" r="5" fill="#FF9A44" stroke="none" />
      <circle cx="340" cy="260" r="5" fill="#FF9A44" stroke="none" />
      <path d="M100 420 L240 420 L240 500" opacity="0.4" />
    </g>
    <g opacity="0.9">
      <path d="M230 380 q60 -10 60 40 q0 60 -70 60 h-140 q-70 0 -70 -55 q0 -35 30 -45" fill="none" stroke="#A97A54" strokeWidth="3" />
      <path d="M195 300 q10 -25 -6 -40" fill="none" stroke="#D8C8AC" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M230 290 q12 -28 -4 -46" fill="none" stroke="#D8C8AC" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
    </g>
  </svg>,
  // 1: mountain skyline (Đà Lạt)
  <svg key="d1" viewBox="0 0 700 400" className="h-auto w-[60%]" style={{ position: "absolute", left: "-4%", bottom: "-4%" }}>
    <g opacity="0.7">
      <path d="M0 300 L120 190 L200 260 L320 140 L420 250 L520 170 L620 260 L700 210 L700 400 L0 400 Z" fill="#182652" />
      <path d="M0 330 L100 250 L210 310 L330 210 L440 300 L560 230 L700 300 L700 400 L0 400 Z" fill="#140D07" />
    </g>
    <g fill="#FF9A44" opacity="0.9" style={{ filter: "drop-shadow(0 0 6px rgba(255,154,68,0.7))" }}>
      <circle cx="120" cy="190" r="4" />
      <circle cx="320" cy="140" r="4" />
      <circle cx="520" cy="170" r="4" />
    </g>
    <g fill="none" stroke="#EE7211" strokeWidth="2" opacity="0.55">
      <path d="M120 190 L120 100 L180 100" />
      <path d="M520 170 L520 90 L460 90" />
    </g>
  </svg>,
  // 2: robot circuit face (CBD Robot)
  <svg key="d2" viewBox="0 0 500 500" className="h-auto w-[44%]" style={{ position: "absolute", right: "0%", top: "12%" }}>
    <g fill="none" stroke="#EE7211" strokeWidth="2.4" opacity="0.75" style={{ filter: "drop-shadow(0 0 8px rgba(238,114,17,0.6))" }}>
      <path d="M60 40 L60 200 Q60 260 130 260 L220 260" />
      <path d="M100 40 L100 160 Q100 200 150 200 L260 200" />
      <path d="M140 40 L140 120 L300 120" />
      <circle cx="60" cy="40" r="5" fill="#EE7211" stroke="none" />
      <circle cx="100" cy="40" r="5" fill="#FF9A44" stroke="none" />
      <circle cx="140" cy="40" r="5" fill="#EE7211" stroke="none" />
      <circle cx="220" cy="260" r="5" fill="#FF9A44" stroke="none" />
      <circle cx="260" cy="200" r="5" fill="#EE7211" stroke="none" />
      <circle cx="300" cy="120" r="5" fill="#FF9A44" stroke="none" />
    </g>
    <path d="M230 60 Q300 55 310 130 Q318 200 260 260 Q220 300 170 300" fill="none" stroke="#D8C8AC" strokeWidth="3" opacity="0.85" />
  </svg>,
];

export default function Hero({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (i: number) => setCurrent(((i % slides.length) + slides.length) % slides.length),
    [slides.length]
  );

  const restart = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6000);
  }, [slides.length]);

  useEffect(() => {
    restart();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [restart]);

  return (
    <header id="top" className="snap-section relative h-screen min-h-[640px] overflow-hidden bg-latte-950 text-latte-100">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 flex items-center transition-all duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)] ${
            i === current ? "z-[2] scale-100 opacity-100" : "z-[1] scale-105 opacity-0"
          }`}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                i % 3 === 0
                  ? "radial-gradient(120% 90% at 80% 20%, #241A10 0%, #1B130B 45%, #140D07 100%)"
                  : i % 3 === 1
                  ? "radial-gradient(120% 90% at 20% 15%, #201735 0%, #1B130B 45%, #140D07 100%)"
                  : "radial-gradient(120% 90% at 75% 75%, #2A1A10 0%, #1B1E3A 40%, #140D07 100%)",
            }}
          />
          {slide.imageId ? (
            <>
              <Image
                src={imageUrl(slide.imageId)!}
                alt=""
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover opacity-70"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, #140D07 0%, rgba(20,13,7,0.85) 32%, rgba(20,13,7,0.35) 60%, rgba(20,13,7,0.15) 100%), linear-gradient(0deg, #140D07 0%, rgba(20,13,7,0) 35%)",
                }}
              />
            </>
          ) : (
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
              {DECOR[i % DECOR.length]}
            </div>
          )}

          <div className="relative z-[3] mx-auto w-full max-w-6xl px-5 sm:px-8">
            <div className="max-w-xl" id="story">
              <span className="eyebrow mb-4 text-orange-400">{slide.eyebrow}</span>
              <h1 className="font-display text-[2.1rem] font-extrabold leading-[1.08] text-latte-100 sm:text-5xl">
                {slide.title}
              </h1>
              <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-latte-200">{slide.body}</p>
              <span className="mt-6 block font-mono text-sm tracking-[0.1em] text-orange-400">
                {String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      ))}

      <div className="pointer-events-none absolute right-6 top-1/2 z-[5] hidden -translate-y-1/2 items-center gap-3 sm:right-8 md:flex">
        <span className="block h-11 w-px bg-latte-200/30" />
        <span className="font-mono text-[0.65rem] tracking-[0.2em] text-latte-200/60 [writing-mode:vertical-rl]">
          CUỘN XUỐNG
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-8 z-[5]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex gap-[10px]">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  goTo(i);
                  restart();
                }}
                className="relative h-[3px] w-9 overflow-hidden rounded-full bg-latte-100/20"
              >
                <span
                  className={`absolute inset-0 origin-left bg-orange-500 shadow-neon-orange-sm transition-transform duration-300 ${
                    i === current ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-[10px]">
            <button
              aria-label="Trước"
              onClick={() => {
                goTo(current - 1);
                restart();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-latte-100/25 bg-latte-100/5 text-latte-100 transition-colors hover:border-orange-400/60 hover:bg-latte-100/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              aria-label="Sau"
              onClick={() => {
                goTo(current + 1);
                restart();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-latte-100/25 bg-latte-100/5 text-latte-100 transition-colors hover:border-orange-400/60 hover:bg-latte-100/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
