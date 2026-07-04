"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { TableRow } from "@/types/admin";

function tableUrl(code: string): string {
  if (typeof window === "undefined") return `/order/t/${code}`;
  return `${window.location.origin}/order/t/${code}`;
}

export default function TablesPanel() {
  const [tables, setTables] = useState<TableRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrTable, setQrTable] = useState<TableRow | null>(null);
  const [renaming, setRenaming] = useState<TableRow | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function load() {
    setLoadError(null);
    try {
      const data = await adminApi.list<TableRow>("/api/tables");
      setTables(data);
    } catch (err) {
      setTables([]);
      setLoadError(err instanceof AdminApiError ? err.message : "Không tải được danh sách bàn.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setCreating(true);
    try {
      await adminApi.create("/api/tables", { label: newLabel.trim() });
      setNewLabel("");
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không tạo được bàn.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(t: TableRow) {
    try {
      await adminApi.update(`/api/tables/${t.id}`, { isActive: !t.isActive });
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không cập nhật được.");
    }
  }

  async function regenerateCode(t: TableRow) {
    if (!window.confirm(`Tạo mã QR mới cho "${t.label}"? Mã QR cũ (đã in/dán) sẽ KHÔNG dùng được nữa.`)) return;
    try {
      await adminApi.update(`/api/tables/${t.id}`, { regenerateCode: true });
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không tạo được mã mới.");
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renaming || !renameValue.trim()) return;
    try {
      await adminApi.update(`/api/tables/${renaming.id}`, { label: renameValue.trim() });
      setRenaming(null);
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không đổi tên được.");
    }
  }

  async function handleDelete(t: TableRow) {
    if (!window.confirm(`Xoá bàn "${t.label}"? Đơn cũ vẫn giữ nguyên, chỉ mất liên kết tới bàn này.`)) return;
    try {
      await adminApi.remove(`/api/tables/${t.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không xoá được bàn.");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-latte-100">Bàn &amp; QR đặt món</h2>
        <p className="mt-1 text-sm text-latte-200/70">
          Mỗi bàn có 1 mã QR riêng dẫn tới trang đặt món — khách quét là vào thẳng, đơn tạo ra tự biết là
          của bàn nào. In QR ra dán tại bàn.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder='Tên bàn, vd: "Bàn 5" hoặc "Sân vườn 2"'
          className="flex-1 rounded-lg border border-latte-700 bg-latte-800 px-3.5 py-2.5 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
        />
        <button
          type="submit"
          disabled={creating || !newLabel.trim()}
          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:opacity-50"
        >
          {creating ? "Đang tạo..." : "+ Thêm bàn"}
        </button>
      </form>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {loadError}
        </div>
      )}

      {tables === null && <p className="text-sm text-latte-400">Đang tải...</p>}
      {tables !== null && tables.length === 0 && !loadError && (
        <p className="text-sm text-latte-400">Chưa có bàn nào — thêm bàn đầu tiên ở trên.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables?.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border p-4 ${t.isActive ? "border-latte-700 bg-latte-800/40" : "border-latte-800 bg-latte-900/40 opacity-60"}`}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <b className="text-sm font-bold text-latte-100">{t.label}</b>
                <p className="font-mono text-[0.65rem] text-latte-400">/order/t/{t.code}</p>
              </div>
              {!t.isActive && (
                <span className="rounded-full bg-latte-700 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-latte-300">
                  Tạm ngưng
                </span>
              )}
            </div>

            <button
              onClick={() => setQrTable(t)}
              className="mb-3 flex w-full items-center justify-center rounded-lg border border-latte-700 bg-white p-3 hover:border-orange-500/50"
            >
              <QRCodeCanvas value={tableUrl(t.code)} size={120} />
            </button>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  setRenaming(t);
                  setRenameValue(t.label);
                }}
                className="rounded-full border border-latte-700 px-3 py-1 text-[0.68rem] font-semibold text-latte-200 hover:bg-latte-700"
              >
                Đổi tên
              </button>
              <button
                onClick={() => toggleActive(t)}
                className="rounded-full border border-latte-700 px-3 py-1 text-[0.68rem] font-semibold text-latte-200 hover:bg-latte-700"
              >
                {t.isActive ? "Tạm ngưng" : "Bật lại"}
              </button>
              <button
                onClick={() => regenerateCode(t)}
                className="rounded-full border border-latte-700 px-3 py-1 text-[0.68rem] font-semibold text-latte-200 hover:bg-latte-700"
              >
                Tạo mã mới
              </button>
              <button
                onClick={() => handleDelete(t)}
                className="rounded-full px-3 py-1 text-[0.68rem] font-semibold text-latte-400 hover:text-orange-300"
              >
                Xoá
              </button>
            </div>
          </div>
        ))}
      </div>

      {qrTable && <QrModal table={qrTable} onClose={() => setQrTable(null)} />}

      {renaming && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4" onClick={() => setRenaming(null)}>
          <form
            onSubmit={handleRename}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-latte-700 bg-latte-900 p-6 shadow-card"
          >
            <h3 className="mb-4 font-display text-lg font-bold text-latte-100">Đổi tên bàn</h3>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mb-4 w-full rounded-lg border border-latte-700 bg-latte-800 px-3.5 py-2.5 text-sm text-latte-100"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRenaming(null)}
                className="rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-200 hover:bg-latte-800"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function QrModal({ table, onClose }: { table: TableRow; onClose: () => void }) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const url = tableUrl(table.code);

  function handleDownload() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${table.label.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-latte-700 bg-latte-900 p-6 text-center shadow-card"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-latte-100">{table.label}</h3>
          <button onClick={onClose} className="text-latte-400 hover:text-latte-100">
            ✕
          </button>
        </div>

        <div ref={canvasWrapRef} className="mx-auto mb-4 inline-block rounded-xl bg-white p-4">
          <QRCodeCanvas value={url} size={220} />
        </div>

        <p className="mb-4 break-all font-mono text-xs text-latte-400">{url}</p>

        <button
          onClick={handleDownload}
          className="w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 py-2.5 text-sm font-bold text-latte-950 shadow-neon-orange-sm"
        >
          Tải ảnh QR (PNG)
        </button>
      </div>
    </div>
  );
}
