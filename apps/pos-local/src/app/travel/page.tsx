"use client";

import { useState } from "react";
import CustomerNav from "@/components/CustomerNav";
import TravelQuiz from "@/components/travel/TravelQuiz";
import TravelPassport from "@/components/travel/TravelPassport";

export default function TravelPage() {
  const [tab, setTab] = useState<"quiz" | "passport">("quiz");

  return (
    <>
      <CustomerNav />
      <div className="max-w-sm mx-auto p-6">
        <h1 className="font-display text-xl font-bold text-latte-100 mb-1">Vi vu Đà Lạt</h1>
        <p className="text-sm text-latte-200/70 mb-5">
          Trò chuyện vài câu để nhận gợi ý lịch trình, hoặc xem lại hộ chiếu Đà Lạt của bạn.
        </p>

        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setTab("quiz")}
            className={`flex-1 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              tab === "quiz" ? "bg-orange-500/20 text-orange-300" : "text-latte-400 hover:text-latte-100"
            }`}
          >
            Gợi ý lịch trình
          </button>
          <button
            onClick={() => setTab("passport")}
            className={`flex-1 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              tab === "passport" ? "bg-orange-500/20 text-orange-300" : "text-latte-400 hover:text-latte-100"
            }`}
          >
            Hộ chiếu của bạn
          </button>
        </div>

        {tab === "quiz" ? <TravelQuiz onItineraryReady={() => {}} /> : <TravelPassport />}
      </div>
    </>
  );
}
