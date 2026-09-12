"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { formatVnd, getOrderStatus, ORDER_STEPS, OrderStatus } from "@cbd/shared-types";
import { Order, StatsResponse } from "@/types/admin";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const STATUS_BADGE: Record<OrderStatus, string> = {
  COMPLETED: "bg-emerald-500/15 text-emerald-300",
  CANCELLED: "bg-latte-600/60 text-latte-300",
  IN_PROGRESS: "bg-orange-500/15 text-orange-300",
};
const STATUS_LABEL: Record<OrderStatus, string> = {
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
  IN_PROGRESS: "Đang xử lý",
};

/**
 * Chỉ xem (read-only) — đơn được tạo và xử lý (đổi trạng thái) tại
 * apps/pos-local, nơi nhân viên đứng quầy thao tác trực tiếp. Dashboard nhận
 * bản đồng bộ qua POST /api/sync/push, dùng để báo cáo/thống kê nhiều quán.
 */
export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [settingBestSeller, setSettingBestSeller] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const [ordersData, statsData] = await Promise.all([
        adminApi.list<Order>("/api/orders"),
        adminApi.get<StatsResponse>("/api/stats"),
      ]);
      setOrders(ordersData);
      setStats(statsData);
    } catch (err) {
      setOrders([]);
      setLoadError(err instanceof AdminApiError ? err.message : "Không tải được dữ liệu đơn hàng.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setBestSeller(menuItemId: string | null) {
    if (!menuItemId) return;
    setSettingBestSeller(menuItemId);
    try {
      await adminApi.create(`/api/menu-items/${menuItemId}/set-best-seller`, {});
      window.alert("Đã cập nhật best-seller trong Thực đơn!");
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không cập nhật được best-seller.");
    } finally {
      setSettingBestSeller(null);
    }
  }

  const shown = orders?.filter((o) => filter === "ALL" || getOrderStatus(o) === filter) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-latte-100">Đơn hàng &amp; Thống kê</h2>
        <p className="mt-1 text-sm text-latte-200/70">
          Báo cáo tổng hợp đơn đã đồng bộ từ các quán (chỉ xem — nhận đơn/pha chế/giao món được nhân viên
          thao tác trực tiếp tại quầy order của từng quán).
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {loadError}
        </div>
      )}

      {/* Thống kê */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tổng số đơn" value={stats ? String(stats.totalOrders) : "—"} />
        <StatCard label="Đơn hôm nay" value={stats ? String(stats.ordersToday) : "—"} />
        <StatCard label="Doanh thu (đã TT)" value={stats ? formatVnd(stats.totalRevenueVnd) : "—"} accent />
        <StatCard
          label="Hoàn tất / Xử lý / Huỷ"
          value={stats ? `${stats.completedOrders} / ${stats.inProgressOrders} / ${stats.cancelledOrders}` : "—"}
        />
      </div>

      {/* Món bán chạy */}
      {stats && stats.topItems.length > 0 && (
        <div className="mb-8 rounded-xl border border-latte-700 bg-latte-800/40 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orange-400">
            Món bán chạy nhất (theo đơn thực tế)
          </p>
          <div className="space-y-2">
            {stats.topItems.map((item, idx) => (
              <div key={`${item.menuItemId}-${item.name}`} className="flex items-center justify-between rounded-lg bg-latte-800/60 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-latte-400">#{idx + 1}</span>
                  <span className="text-sm text-latte-100">{item.name}</span>
                  <span className="font-mono text-xs text-orange-400">×{item.quantitySold}</span>
                </div>
                {item.menuItemId && (
                  <button
                    onClick={() => setBestSeller(item.menuItemId)}
                    disabled={settingBestSeller === item.menuItemId}
                    className="rounded-full border border-orange-500/40 px-3 py-1 text-[0.68rem] font-semibold text-orange-300 hover:bg-orange-500/10 disabled:opacity-50"
                  >
                    {settingBestSeller === item.menuItemId ? "Đang lưu..." : "Đặt best-seller"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["ALL", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              filter === f ? "bg-orange-500/20 text-orange-300" : "text-latte-400 hover:text-latte-100"
            }`}
          >
            {f === "ALL" ? "Tất cả" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Danh sách đơn */}
      {orders === null && <p className="text-sm text-latte-400">Đang tải...</p>}
      {orders !== null && shown.length === 0 && !loadError && (
        <p className="text-sm text-latte-400">Chưa có đơn hàng nào.</p>
      )}

      <div className="space-y-3">
        {shown.map((order) => {
          const status = getOrderStatus(order);
          const doneCount = ORDER_STEPS.filter((s) => order[s.key]).length;
          const hasNote = Boolean(order.customerNote || order.adminNote);
          return (
            <div
              key={order.id}
              className={`rounded-xl border border-latte-700 bg-latte-800/40 p-4 sm:p-5 ${
                status === "CANCELLED" ? "opacity-60" : ""
              }`}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-latte-100">#{order.id.slice(-8)}</span>
                    <span className="rounded-full bg-navy-700/60 px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide text-navy-400">
                      {order.storeName}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide ${STATUS_BADGE[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    {hasNote && (
                      <span title="Có ghi chú" className="text-xs text-latte-400">
                        📝
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-latte-400">
                    {order.tableLabel && <span className="mr-1.5 text-orange-300">🪑 {order.tableLabel} ·</span>}
                    {order.customerName || "Khách vãng lai"} · {formatTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <b className="font-display text-lg text-orange-400">{formatVnd(order.totalVnd)}</b>
                </div>
              </div>

              <ul className="mb-3 space-y-0.5 text-sm text-latte-200/80">
                {order.items.map((it) => (
                  <li key={it.id}>
                    {it.quantity}× {it.nameSnapshot}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  {ORDER_STEPS.map((step) => (
                    <span
                      key={step.key}
                      title={step.label}
                      className={`h-1.5 w-6 rounded-full ${order[step.key] ? "bg-orange-500" : "bg-latte-700"}`}
                    />
                  ))}
                </div>
                <span className="font-mono text-[0.65rem] text-latte-400">{doneCount}/4 bước</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-latte-700 bg-latte-800/40 p-4">
      <p className="mb-1 font-mono text-[0.62rem] uppercase tracking-wide text-latte-400">{label}</p>
      <p className={`font-display text-lg font-bold ${accent ? "text-orange-400" : "text-latte-100"}`}>{value}</p>
    </div>
  );
}
