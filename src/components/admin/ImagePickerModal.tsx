"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { imageUrl, MEDIA_PRESETS, MediaPurpose } from "@/lib/media";
import { MediaAsset } from "@/types/admin";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ImagePickerModal({
  purpose,
  currentId,
  onSelect,
  onClose,
}: {
  purpose: MediaPurpose;
  currentId: string | null | undefined;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const preset = MEDIA_PRESETS[purpose];

  async function load() {
    try {
      const data = await adminApi.list<MediaAsset>(`/api/media?purpose=${purpose}`);
      setAssets(data);
    } catch (err) {
      setAssets([]);
      setLoadError(err instanceof AdminApiError ? err.message : "Không tải được thư viện ảnh.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose]);

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
      const created = json.data as MediaAsset;
      onSelect(created.id);
      onClose();
    } catch (err) {
      setUploadError(err instanceof AdminApiError ? err.message : "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-latte-700 bg-latte-900 p-6 shadow-card"
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-latte-100">Chọn ảnh — {preset.label}</h3>
          <button onClick={onClose} className="text-latte-400 hover:text-latte-100">
            ✕
          </button>
        </div>
        <p className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 font-mono text-xs font-bold text-orange-300">
          📐 Kích thước chuẩn cho vị trí này: {preset.ratioLabel} — ảnh sẽ tự resize + convert WebP.
        </p>

        {/* Upload mới */}
        <form onSubmit={handleUpload} className="mb-6 rounded-xl border border-latte-700 bg-latte-800/50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orange-400">Tải ảnh mới</p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mb-3 block w-full text-sm text-latte-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-300"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='Ghi chú: ảnh này dùng cho phần nào? (vd: "Hero slide 2 — sương mù Đà Lạt")'
            rows={2}
            className="mb-3 w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
          />
          {uploadError && <p className="mb-3 text-xs text-orange-300">{uploadError}</p>}
          <button
            type="submit"
            disabled={!file || uploading}
            className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Đang xử lý..." : "Tải lên & dùng ảnh này"}
          </button>
        </form>

        {/* Thư viện có sẵn */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-latte-200/70">
          Ảnh có sẵn ({preset.label.split(" — ")[0]})
        </p>

        {currentId && (
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="mb-3 text-xs text-latte-400 underline hover:text-orange-300"
          >
            Bỏ chọn ảnh hiện tại
          </button>
        )}

        {loadError && <p className="mb-3 text-xs text-orange-300">{loadError}</p>}
        {assets === null && <p className="text-sm text-latte-400">Đang tải...</p>}
        {assets !== null && assets.length === 0 && !loadError && (
          <p className="text-sm text-latte-400">Chưa có ảnh nào cho mục đích này — tải ảnh mới ở trên.</p>
        )}

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {assets?.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onSelect(a.id);
                onClose();
              }}
              className={`group relative overflow-hidden rounded-lg border-2 text-left ${
                a.id === currentId ? "border-orange-500" : "border-transparent hover:border-latte-600"
              }`}
              title={a.note}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(a.id)} alt={a.note} className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1">
                <p className="truncate text-[0.62rem] text-latte-100">{a.note}</p>
                <p className="text-[0.58rem] text-latte-400">{formatBytes(a.byteSize)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
