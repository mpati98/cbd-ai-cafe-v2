"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { TableRow } from "@/types/admin";

/** Chỉ xem — bàn được tạo/đổi tên/thu hồi QR tại apps/pos-local (in QR ngay
 * tại quán). Dashboard nhận bản đồng bộ qua POST /api/sync/push. */
export default function TablesReportPanel() {
  const [tables, setTables] = useState<TableRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .list<TableRow>("/api/tables")
      .then(setTables)
      .catch((err) => {
        setTables([]);
        setLoadError(err instanceof AdminApiError ? err.message : "Không tải được danh sách bàn.");
      });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-latte-100">Bàn &amp; QR (báo cáo)</h2>
        <p className="mt-1 text-sm text-latte-200/70">
          Danh sách bàn đã đồng bộ từ các quán — quản lý (tạo/đổi tên/thu hồi QR) thực hiện trực tiếp tại
          quầy order của từng quán (apps/pos-local).
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">{loadError}</div>
      )}

      {tables === null && <p className="text-sm text-latte-400">Đang tải...</p>}
      {tables !== null && tables.length === 0 && !loadError && <p className="text-sm text-latte-400">Chưa có bàn nào.</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables?.map((t) => (
          <div key={t.id} className={`rounded-xl border p-4 ${t.isActive ? "border-latte-700 bg-latte-800/40" : "border-latte-800 bg-latte-900/40 opacity-60"}`}>
            <div className="flex items-start justify-between">
              <div>
                <b className="text-sm font-bold text-latte-100">{t.label}</b>
                <p className="font-mono text-[0.65rem] text-latte-400">/order/t/{t.code}</p>
              </div>
              {!t.isActive && (
                <span className="rounded-full bg-latte-700 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-latte-300">Tạm ngưng</span>
              )}
            </div>
            <span className="mt-2 inline-block rounded-full bg-navy-700/60 px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide text-navy-400">
              {t.storeName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
