"use client";

import { useEffect, useState } from "react";
import { getVisitedLocationIds, markLocationVisited, unmarkLocationVisited } from "@/lib/travel-passport";
import type { TravelLocation } from "@/types/travel";

/** "Hộ chiếu Đà Lạt" — không tài khoản, không lưu server, đọc/ghi hoàn toàn
 * qua localStorage (xem lib/travel-passport.ts). Gợi ý tiếp dựa trên
 * relatedLocationIds của các địa điểm đã ghé, trừ đi những gì đã ghé rồi. */
export default function TravelPassport() {
  const [allLocations, setAllLocations] = useState<TravelLocation[] | null>(null);
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  function refreshVisited() {
    setVisitedIds(getVisitedLocationIds());
  }

  useEffect(() => {
    refreshVisited();
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) setAllLocations(data.data);
        else throw new Error(data?.error || "Không tải được danh sách địa điểm.");
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Không tải được danh sách địa điểm."));
  }, []);

  if (loadError) {
    return <p className="text-sm text-red-400">{loadError}</p>;
  }
  if (allLocations === null) {
    return <p className="text-sm text-latte-400">Đang tải...</p>;
  }

  const byId = new Map(allLocations.map((l) => [l.id, l]));
  const visited = visitedIds.map((id) => byId.get(id)).filter((l): l is TravelLocation => Boolean(l));

  const relatedIds = new Set<string>();
  for (const l of visited) {
    for (const relId of l.relatedLocationIds) {
      if (!visitedIds.includes(relId)) relatedIds.add(relId);
    }
  }
  const suggested = Array.from(relatedIds)
    .map((id) => byId.get(id))
    .filter((l): l is TravelLocation => Boolean(l));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-300">
          Đã ghé ({visited.length})
        </h3>
        {visited.length === 0 ? (
          <p className="text-sm text-latte-400">
            Chưa có địa điểm nào — bấm &quot;Đánh dấu đã ghé&quot; khi xem lịch trình ở tab &quot;Vi vu Đà Lạt&quot;.
          </p>
        ) : (
          <div className="space-y-2">
            {visited.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div>
                  <b className="text-sm font-bold text-latte-100">{l.name}</b>
                  <p className="text-xs text-latte-400">{l.category}</p>
                </div>
                <button
                  onClick={() => {
                    unmarkLocationVisited(l.id);
                    refreshVisited();
                  }}
                  className="shrink-0 text-xs text-latte-400 hover:text-red-300"
                >
                  Bỏ đánh dấu
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {suggested.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-300">Gợi ý tiếp cho bạn</h3>
          <div className="space-y-2">
            {suggested.map((l) => (
              <div key={l.id} className="rounded-xl border border-latte-700 bg-latte-800/50 p-3">
                <b className="text-sm font-bold text-latte-100">{l.name}</b>
                <p className="mt-0.5 text-xs text-latte-200/75">{l.description}</p>
                <button
                  onClick={() => {
                    markLocationVisited(l.id);
                    refreshVisited();
                  }}
                  className="mt-2 rounded-lg border border-orange-500/40 px-3 py-1.5 text-xs font-semibold text-orange-300 hover:bg-orange-500/10"
                >
                  Đánh dấu đã ghé
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
