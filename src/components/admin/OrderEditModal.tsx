"use client";

import { useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { formatVnd } from "@/lib/format";
import { Order } from "@/types/admin";
import { getOrderStatus, ORDER_STEPS, OrderStatus } from "@/lib/orders";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

export default function OrderEditModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [steps, setSteps] = useState({
    isReceived: order.isReceived,
    isPreparing: order.isPreparing,
    isPaid: order.isPaid,
    isDelivered: order.isDelivered,
  });
  const [isCancelled, setIsCancelled] = useState(order.isCancelled);
  const [adminNote, setAdminNote] = useState(order.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = getOrderStatus({ ...steps, isCancelled });

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await adminApi.update(`/api/orders/${order.id}`, {
        ...steps,
        isCancelled,
        adminNote: adminNote.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Không lưu được thay đổi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-latte-700 bg-latte-900 p-6 shadow-card"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-latte-100">Đơn #{order.id.slice(-8)}</h3>
              <span className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide ${STATUS_BADGE[status]}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-latte-400">
              {order.tableLabel && <span className="mr-1.5 text-orange-300">🪑 {order.tableLabel} ·</span>}
              {order.customerName || "Khách vãng lai"} · {formatTime(order.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="text-latte-400 hover:text-latte-100">
            ✕
          </button>
        </div>

        {/* Danh sách món */}
        <div className="mb-4 rounded-xl border border-latte-700 bg-latte-800/40 p-4">
          <ul className="space-y-1 text-sm text-latte-200/85">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between">
                <span>
                  {it.quantity}× {it.nameSnapshot}
                </span>
                <span className="font-mono text-xs text-latte-400">{formatVnd(it.priceVndSnapshot * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-latte-700 pt-3">
            <span className="text-sm font-semibold text-latte-200">Tổng cộng</span>
            <b className="font-display text-lg text-orange-400">{formatVnd(order.totalVnd)}</b>
          </div>
        </div>

        {/* Ghi chú của khách */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-latte-200/80">Ghi chú của khách</p>
          {order.customerNote ? (
            <p className="rounded-lg border border-latte-700 bg-latte-800/60 px-3 py-2.5 text-sm italic text-latte-200/90">
              “{order.customerNote}”
            </p>
          ) : (
            <p className="rounded-lg border border-dashed border-latte-700 px-3 py-2.5 text-sm text-latte-400">
              Khách không để lại ghi chú.
            </p>
          )}
        </div>

        {/* 4 mốc xử lý */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-latte-200/80">Tiến trình xử lý</p>
          <div className="flex flex-wrap gap-2">
            {ORDER_STEPS.map((step) => {
              const done = steps[step.key];
              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={isCancelled}
                  onClick={() => setSteps((s) => ({ ...s, [step.key]: !s[step.key] }))}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    done
                      ? "border-orange-500 bg-orange-500/15 text-orange-300"
                      : "border-latte-700 text-latte-400 hover:border-latte-500"
                  }`}
                >
                  {done ? "✓ " : ""}
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Huỷ đơn — tách riêng vì đây là trạng thái đặc biệt, không thuộc chuỗi 4 mốc */}
        <div className="mb-4 rounded-xl border border-latte-700 bg-latte-800/30 p-4">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-latte-100">Huỷ đơn này</span>
              <span className="block text-xs text-latte-400">
                Dùng khi khách đổi ý hoặc không thể hoàn tất — đơn vẫn được lưu lại, không bị xoá.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsCancelled((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isCancelled ? "bg-red-500/80" : "bg-latte-700"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  isCancelled ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Ghi chú nội bộ */}
        <div className="mb-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
            Ghi chú nội bộ (chỉ nhân viên thấy)
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
            placeholder="vd: khách quen, gọi lại xác nhận trước khi giao..."
            className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
          />
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-300">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-200 hover:bg-latte-800"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
