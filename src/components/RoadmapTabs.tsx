"use client";

import { useState } from "react";
import { BRANCH_STATUS_LABEL } from "@/lib/constants";

type RoadmapItem = { id: string; period: string; title: string; description: string };
type Branch = {
  id: string;
  name: string;
  status: string;
  etaLabel: string;
  description: string;
};

export default function RoadmapTabs({ roadmap, branches }: { roadmap: RoadmapItem[]; branches: Branch[] }) {
  const [tab, setTab] = useState<"timeline" | "branches">("timeline");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex gap-2 lg:mb-8">
        <button
          onClick={() => setTab("timeline")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "timeline" ? "bg-orange-500/15 text-orange-300" : "text-latte-300 hover:text-latte-100"
          }`}
        >
          Lộ trình phát triển
        </button>
        <button
          onClick={() => setTab("branches")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "branches" ? "bg-orange-500/15 text-orange-300" : "text-latte-300 hover:text-latte-100"
          }`}
        >
          Chi nhánh sắp mở cửa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "timeline" ? (
          <div className="relative pl-8">
            <div
              className="absolute bottom-1.5 left-[5px] top-1.5 w-[2px]"
              style={{ background: "linear-gradient(#EE7211, #A97A54)", boxShadow: "0 0 8px rgba(238,114,17,0.5)" }}
            />
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {roadmap.map((r) => (
                <div key={r.id} className="relative">
                  <span
                    className="absolute -left-[2.05rem] top-1 h-3 w-3 rounded-full border-[3px] border-orange-500 bg-latte-950"
                    style={{ boxShadow: "0 0 10px rgba(238,114,17,0.75)" }}
                  />
                  <span className="mb-1 block font-mono text-xs font-bold tracking-[0.1em] text-orange-400">{r.period}</span>
                  <h4 className="font-display text-lg font-bold text-latte-100">{r.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-latte-200/75">{r.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {branches.map((b) => (
              <div
                key={b.id}
                className="h-full rounded-[18px] border border-latte-700 bg-latte-800/50 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-500/40 hover:shadow-neon-orange-sm"
              >
                <span className="mb-4 inline-block rounded-full bg-latte-700 px-2.5 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.08em] text-orange-300">
                  {BRANCH_STATUS_LABEL[b.status] ?? b.status}
                </span>
                <h4 className="font-display text-base font-bold text-latte-100">{b.name}</h4>
                <div className="mb-2 mt-1 text-xs font-bold text-orange-400">Dự kiến khai trương: {b.etaLabel}</div>
                <p className="text-sm leading-relaxed text-latte-200/75">{b.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
