"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";

type SystemPromptConfig = { id: string; version: number; content: string };

/** Sửa template order-chat — placeholder {{TABLE_LINE}} và {{MENU_BLOCK}} bắt
 * buộc phải giữ nguyên, xem apps/pos-local/src/lib/order-chat.ts::buildSystemPrompt(). */
export default function SystemPromptPanel() {
  const [config, setConfig] = useState<SystemPromptConfig | null>(null);
  const [content, setContent] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const data = await adminApi.get<SystemPromptConfig>("/api/system-prompt");
      setConfig(data);
      setContent(data?.content ?? "");
    } catch (err) {
      setLoadError(err instanceof AdminApiError ? err.message : "Không tải được system prompt.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const missingPlaceholders = [
    !content.includes("{{TABLE_LINE}}") && "{{TABLE_LINE}}",
    !content.includes("{{MENU_BLOCK}}") && "{{MENU_BLOCK}}",
  ].filter(Boolean) as string[];

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await adminApi.update<SystemPromptConfig>("/api/system-prompt", { content });
      if (!updated) throw new Error("Không nhận được dữ liệu system prompt vừa lưu.");
      setConfig(updated);
      window.alert(`Đã lưu — version ${updated.version}. pos-local sẽ nhận bản mới ở lần config-sync kế tiếp (vài phút).`);
    } catch (err) {
      setSaveError(err instanceof AdminApiError ? err.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-latte-100">System prompt — order-chat</h2>
        <p className="mt-1 text-sm text-latte-200/70">
          Template dùng bởi CBD Robot ở trang đặt món tại mọi quán (đồng bộ xuống qua ConfigSyncResponse). Phải giữ
          nguyên 2 placeholder <code className="rounded bg-latte-800 px-1 py-0.5 font-mono text-xs">{"{{TABLE_LINE}}"}</code> và{" "}
          <code className="rounded bg-latte-800 px-1 py-0.5 font-mono text-xs">{"{{MENU_BLOCK}}"}</code> — pos-local tự thay bằng
          dòng "khách ngồi bàn X" và danh sách thực đơn hiện có.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">{loadError}</div>
      )}

      {config && (
        <p className="mb-3 font-mono text-xs text-latte-400">Version hiện tại: v{config.version}</p>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        className="w-full rounded-xl border border-latte-700 bg-latte-800 p-4 font-mono text-sm text-latte-100 focus:border-orange-500/60"
      />

      {missingPlaceholders.length > 0 && (
        <p className="mt-2 text-sm text-orange-300">
          Thiếu placeholder bắt buộc: {missingPlaceholders.join(", ")} — order-chat sẽ không chèn được bàn/thực đơn nếu thiếu.
        </p>
      )}
      {saveError && <p className="mt-2 text-sm text-orange-300">{saveError}</p>}

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || missingPlaceholders.length > 0 || !content.trim()}
          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu & tăng version"}
        </button>
      </div>
    </div>
  );
}
