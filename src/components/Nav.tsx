"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "#story", label: "Câu chuyện" },
  { href: "#menu", label: "Thực đơn" },
  { href: "#roadmap", label: "Hướng phát triển" },
  { href: "#footer", label: "Liên hệ" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-[100] transition-all duration-500 ${
        scrolled
          ? "bg-latte-950/90 backdrop-blur-md py-3 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-[10px] shadow-neon-orange-sm">
            <Image src="/logo.webp" alt="CBD AI Cafe" width={36} height={36} className="rounded-[10px]" priority />
          </span>
          <span className="flex flex-col leading-none">
            <b className="font-display text-sm font-black tracking-tight text-latte-100">
              CBD AI CAFE
            </b>
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-orange-400">
              Kết nối công nghệ
            </span>
          </span>
        </a>

        <ul
          className={`fixed inset-y-0 right-0 z-[110] flex w-[78%] max-w-xs flex-col gap-7 bg-latte-950 px-8 pt-24 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] sm:static sm:w-auto sm:max-w-none sm:translate-x-0 sm:flex-row sm:items-center sm:gap-9 sm:bg-transparent sm:px-0 sm:pt-0 ${
            open ? "translate-x-0" : "translate-x-full sm:translate-x-0"
          }`}
        >
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="group relative text-sm font-semibold text-latte-200 transition-colors hover:text-latte-100"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
          <li>
            <a
              href="/order"
              onClick={() => setOpen(false)}
              className="inline-block rounded-full bg-gradient-to-br from-orange-500 to-orange-600 px-5 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm transition-shadow hover:shadow-neon-orange"
            >
              Đặt món
            </a>
          </li>
        </ul>

        <button
          aria-label="Mở menu"
          onClick={() => setOpen((v) => !v)}
          className="z-[120] flex flex-col gap-[5px] sm:hidden"
        >
          <span className={`h-[2px] w-6 bg-latte-100 transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`} />
          <span className={`h-[2px] w-6 bg-latte-100 transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`h-[2px] w-6 bg-latte-100 transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
        </button>
      </div>
    </nav>
  );
}
