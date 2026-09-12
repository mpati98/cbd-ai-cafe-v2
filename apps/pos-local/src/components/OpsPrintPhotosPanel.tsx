"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { opsApi, OpsApiError } from "@/lib/ops-api";
import { PrintPhoto } from "@/types/ops";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Hàng đợi ảnh in lưu niệm (career-prediction) — khách bấm "In ảnh" ở trang
 * /career-prediction sẽ đẩy ảnh vào đây, nhân viên bấm "In" để mở trang in
 * riêng (khổ 4x6 inch) rồi đánh dấu đã in. Cần đăng nhập (mật khẩu chung, xem
 * lib/ops-auth.ts) vì ảnh có khuôn mặt khách - khác các trang /ops khác. */
export default function OpsPrintPhotosPanel() {
  const router = useRouter();
  const [photos, setPhotos] = useState<PrintPhoto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"PENDING" | "PRINTED" | "ALL">("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const data = await opsApi.list<PrintPhoto>("/api/print-photos");
      setPhotos(data);
    } catch (err) {
      if (err instanceof OpsApiError && err.status === 401) {
        router.push("/ops/print-photos/login");
        return;
      }
      setPhotos([]);
      setLoadError(err instanceof OpsApiError ? err.message : "Không tải được danh sách ảnh in.");
    }
  }

  async function handleLogout() {
    await fetch("/api/ops/print-photos-auth", { method: "DELETE" }).catch(() => {});
    router.push("/ops/print-photos/login");
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  async function markPrinted(id: string) {
    setBusyId(id);
    try {
      await opsApi.update(`/api/print-photos/${id}`, { isPrinted: true });
      await load();
    } catch (err) {
      setLoadError(err instanceof OpsApiError ? err.message : "Không đánh dấu được.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Xoá ảnh này? Không thể hoàn tác.")) return;
    setBusyId(id);
    try {
      await opsApi.remove(`/api/print-photos/${id}`);
      await load();
    } catch (err) {
      setLoadError(err instanceof OpsApiError ? err.message : "Không xoá được.");
    } finally {
      setBusyId(null);
    }
  }

  const shown =
    photos?.filter((p) => {
      if (filter === "PENDING") return !p.isPrinted;
      if (filter === "PRINTED") return p.isPrinted;
      return true;
    }) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-latte-100">Ảnh in lưu niệm</h2>
          <p className="mt-1 text-sm text-latte-200/70">
            Ảnh khách tạo từ tính năng dự đoán nghề nghiệp — bấm "In" để mở trang in khổ 4x6 inch.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 rounded-lg border border-latte-700 px-3 py-1.5 text-xs font-semibold text-latte-300 hover:border-red-500/40 hover:text-red-300"
        >
          Đăng xuất
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {loadError}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["PENDING", "Chưa in"],
            ["PRINTED", "Đã in"],
            ["ALL", "Tất cả"],
          ] as const
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              filter === f ? "bg-orange-500/20 text-orange-300" : "text-latte-400 hover:text-latte-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {photos === null && <p className="text-sm text-latte-400">Đang tải...</p>}
      {photos !== null && shown.length === 0 && !loadError && (
        <p className="text-sm text-latte-400">Không có ảnh nào.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((photo) => (
          <div
            key={photo.id}
            className="overflow-hidden rounded-xl border border-latte-700 bg-latte-800/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/print-photos/${photo.id}/image`}
              alt={photo.careerName}
              className="aspect-2/3 w-full object-cover"
            />
            <div className="p-3">
              <p className="truncate text-sm font-semibold text-latte-100" title={photo.careerName}>
                {photo.careerName}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-latte-400">
                {formatTime(photo.createdAt)}
                {photo.isPrinted && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                    Đã in
                  </span>
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <a
                  href={`/print/${photo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => !photo.isPrinted && markPrinted(photo.id)}
                  className="flex-1 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-3 py-2 text-center text-xs font-bold text-latte-950 shadow-neon-orange-sm transition-transform hover:scale-105"
                >
                  In
                </a>
                <button
                  onClick={() => remove(photo.id)}
                  disabled={busyId === photo.id}
                  className="rounded-lg border border-latte-700 px-3 py-2 text-xs font-semibold text-latte-300 hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                >
                  Xoá
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
