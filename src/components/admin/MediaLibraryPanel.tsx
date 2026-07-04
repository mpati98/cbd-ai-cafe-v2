"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { imageUrl, MEDIA_PURPOSE_OPTIONS, MediaPurpose } from "@/lib/media";
import { MediaAsset } from "@/types/admin";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaLibraryPanel() {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MediaPurpose | "ALL">("ALL");

  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<MediaPurpose>("HERO");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const data = await adminApi.list<MediaAsset>("/api/media");
      setAssets(data);
    } catch (err) {
      setAssets([]);
      setLoadError(err instanceof AdminApiError ? err.message : "Không tải được thư viện ảnh.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (note.trim().length < 3) {
      setUploadError("Cần ghi chú (tối thiểu 3 ký tự) mô tả ảnh dùng cho phần nào.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", purpose);
      form.append("note", note.trim());
      const res = await fetch("/api/media", { method: "POST", body: form, credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new AdminApiError(res.status, json?.error ?? `Lỗi HTTP ${res.status}`, json?.details);
      }
      setFile(null);
      setNote("");
      await load();
    } catch (err) {
      setUploadError(err instanceof AdminApiError ? err.message : "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(asset: MediaAsset) {
    if (!window.confirm(`Xoá ảnh "${asset.note}"? Slide/món đang dùng ảnh này sẽ mất ảnh (không bị xoá).`)) return;
    try {
      await adminApi.remove(`/api/media/${asset.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không xoá được.");
    }
  }

  const shown = assets?.filter((a) => filter === "ALL" || a.purpose === filter) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-latte-100">Thư viện ảnh</h2>
        <p className="mt-1 text-sm text-latte-200/70">
          Upload ảnh minh hoạ cho hero và thực đơn tại đây, ảnh tự động resize + convert sang WebP theo kích
          thước chuẩn. Sau đó vào form Hero/Thực đơn để gắn ảnh cho từng slide/món, hoặc chọn thẳng trong
          bước tải lên ở đó.
        </p>
      </div>

      <form onSubmit={handleUpload} className="mb-8 rounded-xl border border-latte-700 bg-latte-800/50 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-orange-400">Tải ảnh mới</p>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
            Dùng cho (chọn 1 vị trí — ảnh sẽ tự resize đúng kích thước của vị trí đó)
          </label>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {MEDIA_PURPOSE_OPTIONS.map((opt) => {
              const active = purpose === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPurpose(opt.value)}
                  className={`rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                    active ? "border-orange-500 bg-orange-500/10" : "border-latte-700 bg-latte-800 hover:border-latte-500"
                  }`}
                >
                  <span className={`block text-sm font-bold ${active ? "text-orange-300" : "text-latte-100"}`}>
                    {opt.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-latte-400">
                    Kích thước chuẩn: {opt.ratioLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">File ảnh</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-latte-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-300"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
            Ghi chú — ảnh này dùng cho phần nào *
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='vd: "Hero slide 1 — cận cảnh hạt cà phê rang" hoặc "Ảnh món Cold Brew Tầng Mây"'
            rows={2}
            className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
          />
        </div>

        {uploadError && <p className="mt-3 text-sm text-orange-300">{uploadError}</p>}

        <button
          type="submit"
          disabled={!file || uploading}
          className="mt-4 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Đang xử lý..." : "Tải lên"}
        </button>
      </form>

      <div className="mb-4 flex items-center gap-2">
        {(["ALL", ...MEDIA_PURPOSE_OPTIONS.map((o) => o.value)] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === f ? "bg-orange-500/20 text-orange-300" : "text-latte-400 hover:text-latte-100"
            }`}
          >
            {f === "ALL" ? "Tất cả" : MEDIA_PURPOSE_OPTIONS.find((o) => o.value === f)?.name}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {loadError}
        </div>
      )}

      {assets === null && <p className="text-sm text-latte-400">Đang tải...</p>}
      {assets !== null && shown.length === 0 && !loadError && (
        <p className="text-sm text-latte-400">Chưa có ảnh nào.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((a) => (
          <div key={a.id} className="overflow-hidden rounded-xl border border-latte-700 bg-latte-800/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(a.id)} alt={a.note} className="aspect-square w-full object-cover" />
            <div className="p-3">
              <span className="mb-1 inline-block rounded-full bg-latte-700 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-orange-300">
                {MEDIA_PURPOSE_OPTIONS.find((o) => o.value === a.purpose)?.name ?? a.purpose}
              </span>
              <p className="mb-1 line-clamp-2 text-xs text-latte-100">{a.note}</p>
              <p className="mb-2 text-[0.65rem] text-latte-400">
                {a.width}×{a.height} · {formatBytes(a.byteSize)}
              </p>
              <button onClick={() => handleDelete(a)} className="text-[0.68rem] text-latte-400 hover:text-orange-300">
                Xoá
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
