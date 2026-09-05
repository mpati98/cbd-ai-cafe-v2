"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { Store } from "@/types/admin";

function formatTime(iso: string | null) {
  if (!iso) return "Chưa có";
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Provision quán mới + xem tình trạng đồng bộ (health ping từ apps/pos-local). */
export default function StoresPanel() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ storeName: string; apiKey: string } | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const data = await adminApi.list<Store>("/api/stores");
      setStores(data);
    } catch (err) {
      setStores([]);
      setLoadError(err instanceof AdminApiError ? err.message : "Không tải được danh sách quán.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const store = await adminApi.create<Store & { apiKey: string }>("/api/stores", { name: newName.trim() });
      if (!store) throw new Error("Không nhận được dữ liệu quán vừa tạo.");
      setNewName("");
      setNewKey({ storeName: store.name, apiKey: store.apiKey });
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không tạo được quán.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(s: Store) {
    try {
      await adminApi.update(`/api/stores/${s.id}`, { isActive: !s.isActive });
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không cập nhật được.");
    }
  }

  async function regenerateKey(s: Store) {
    if (!window.confirm(`Cấp lại API key cho "${s.name}"? Key cũ sẽ ngừng hoạt động ngay — cần cập nhật STORE_API_KEY trong .env của pos-local tại quán đó.`)) return;
    try {
      const updated = await adminApi.update<Store & { apiKey: string }>(`/api/stores/${s.id}`, { regenerateApiKey: true });
      if (!updated) throw new Error("Không nhận được dữ liệu quán vừa cập nhật.");
      setNewKey({ storeName: updated.name, apiKey: updated.apiKey });
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không cấp lại được API key.");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-latte-100">Quán &amp; đồng bộ</h2>
        <p className="mt-1 text-sm text-latte-200/70">
          Mỗi quán chạy 1 instance apps/pos-local riêng (Docker, tại quán) — provision ở đây để lấy API key
          dán vào <code className="rounded bg-latte-800 px-1 py-0.5 font-mono text-xs">STORE_API_KEY</code> của quán đó.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='Tên quán, vd: "CBD AI Cafe — Đà Lạt Trung Tâm"'
          className="flex-1 rounded-lg border border-latte-700 bg-latte-800 px-3.5 py-2.5 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:opacity-50"
        >
          {creating ? "Đang tạo..." : "+ Thêm quán"}
        </button>
      </form>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {loadError}
        </div>
      )}

      {stores === null && <p className="text-sm text-latte-400">Đang tải...</p>}
      {stores !== null && stores.length === 0 && !loadError && (
        <p className="text-sm text-latte-400">Chưa có quán nào — thêm quán đầu tiên ở trên.</p>
      )}

      <div className="space-y-3">
        {stores?.map((s) => {
          const pingAgeMs = s.lastHealthPingAt ? Date.now() - new Date(s.lastHealthPingAt).getTime() : null;
          const online = pingAgeMs !== null && pingAgeMs < 5 * 60 * 1000;
          return (
            <div key={s.id} className={`rounded-xl border p-4 ${s.isActive ? "border-latte-700 bg-latte-800/40" : "border-latte-800 bg-latte-900/40 opacity-60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-latte-600"}`} />
                  <b className="text-sm font-bold text-latte-100">{s.name}</b>
                  {!s.isActive && <span className="rounded-full bg-latte-700 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-latte-300">Đã khoá</span>}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => regenerateKey(s)} className="rounded-full border border-latte-700 px-3 py-1 text-[0.68rem] font-semibold text-latte-200 hover:bg-latte-700">
                    Cấp lại API key
                  </button>
                  <button onClick={() => toggleActive(s)} className="rounded-full border border-latte-700 px-3 py-1 text-[0.68rem] font-semibold text-latte-200 hover:bg-latte-700">
                    {s.isActive ? "Khoá" : "Mở lại"}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-latte-400">
                Ping gần nhất: {formatTime(s.lastHealthPingAt)}
                {s.lastPendingSyncCount !== null && <> · {s.lastPendingSyncCount} bản ghi đang chờ đồng bộ</>}
              </p>
            </div>
          );
        })}
      </div>

      {newKey && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4" onClick={() => setNewKey(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-latte-700 bg-latte-900 p-6 shadow-card">
            <h3 className="mb-2 font-display text-lg font-bold text-latte-100">API key cho &quot;{newKey.storeName}&quot;</h3>
            <p className="mb-3 text-sm text-orange-300">
              Chỉ hiển thị 1 LẦN DUY NHẤT — sao chép và dán ngay vào <code className="rounded bg-latte-800 px-1 py-0.5 font-mono text-xs">.env</code> của
              apps/pos-local tại quán này (biến <code className="rounded bg-latte-800 px-1 py-0.5 font-mono text-xs">STORE_API_KEY</code>).
            </p>
            <pre className="mb-4 overflow-x-auto rounded-lg border border-latte-700 bg-latte-800 p-3 font-mono text-xs text-latte-100">{newKey.apiKey}</pre>
            <div className="flex justify-end">
              <button
                onClick={() => setNewKey(null)}
                className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm"
              >
                Đã lưu, đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
