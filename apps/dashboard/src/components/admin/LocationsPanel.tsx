"use client";

import { useEffect, useMemo, useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { Location, LocationStatus, Store } from "@/types/admin";
import { SessionUser } from "@/lib/auth-types";

const CATEGORY_SUGGESTIONS = ["thiên nhiên", "check-in", "ẩm thực", "yên tĩnh"];

const STATUS_LABEL: Record<LocationStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};
const STATUS_BADGE: Record<LocationStatus, string> = {
  PENDING: "bg-orange-500/15 text-orange-300",
  APPROVED: "bg-emerald-500/15 text-emerald-300",
  REJECTED: "bg-latte-600/60 text-latte-300",
};

const emptyForm = {
  name: "",
  description: "",
  category: "",
  bestTimeToVisit: "",
  relatedLocationIds: [] as string[],
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function LocationsPanel({ user }: { user: SessionUser }) {
  const isAdmin = user.role === "ADMIN";

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(isAdmin ? "" : user.storeId ?? "");
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LocationStatus | "ALL">("PENDING");
  const [editing, setEditing] = useState<Location | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ADMIN quản lý nhiều quán -> cần dropdown chọn quán (chỉ ADMIN mới gọi
  // được GET /api/stores, xem apps/dashboard/src/app/api/stores/route.ts).
  useEffect(() => {
    if (!isAdmin) return;
    adminApi
      .list<Store>("/api/stores")
      .then((data) => {
        setStores(data);
        setSelectedStoreId((current) => current || data[0]?.id || "");
      })
      .catch(() => setStores([]));
  }, [isAdmin]);

  async function load(storeId: string) {
    if (!storeId) {
      setLocations([]);
      return;
    }
    setLoadError(null);
    try {
      const data = await adminApi.list<Location>(`/api/locations?storeId=${encodeURIComponent(storeId)}`);
      setLocations(data);
    } catch (err) {
      setLocations([]);
      setLoadError(err instanceof AdminApiError ? err.message : "Không tải được danh sách địa điểm.");
    }
  }

  useEffect(() => {
    load(selectedStoreId);
  }, [selectedStoreId]);

  const shown = locations?.filter((l) => filter === "ALL" || l.status === filter) ?? [];
  const categoryOptions = useMemo(
    () => Array.from(new Set([...CATEGORY_SUGGESTIONS, ...(locations ?? []).map((l) => l.category)])),
    [locations]
  );

  function openNew() {
    setForm(emptyForm);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(loc: Location) {
    setForm({
      name: loc.name,
      description: loc.description,
      category: loc.category,
      bestTimeToVisit: loc.bestTimeToVisit ?? "",
      relatedLocationIds: loc.relatedLocationIds,
    });
    setFormError(null);
    setEditing(loc);
  }

  function toggleRelated(id: string) {
    setForm((f) => ({
      ...f,
      relatedLocationIds: f.relatedLocationIds.includes(id)
        ? f.relatedLocationIds.filter((x) => x !== id)
        : [...f.relatedLocationIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await adminApi.create("/api/locations", {
          storeId: selectedStoreId,
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category.trim(),
          bestTimeToVisit: form.bestTimeToVisit.trim() || null,
          relatedLocationIds: form.relatedLocationIds,
        });
      } else if (editing) {
        await adminApi.update(`/api/locations/${editing.id}`, {
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category.trim(),
          bestTimeToVisit: form.bestTimeToVisit.trim() || null,
          relatedLocationIds: form.relatedLocationIds,
        });
      }
      setEditing(null);
      await load(selectedStoreId);
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Không lưu được.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(loc: Location, status: LocationStatus) {
    try {
      await adminApi.update(`/api/locations/${loc.id}`, { status });
      await load(selectedStoreId);
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không cập nhật được trạng thái.");
    }
  }

  async function handleDelete(loc: Location) {
    if (!window.confirm(`Xoá địa điểm "${loc.name}"? Không thể hoàn tác.`)) return;
    try {
      await adminApi.remove(`/api/locations/${loc.id}`);
      await load(selectedStoreId);
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không xoá được.");
    }
  }

  if (!isAdmin && !user.storeId) {
    return (
      <div>
        <h2 className="font-display text-xl font-bold text-latte-100">Địa điểm Đà Lạt</h2>
        <p className="mt-3 text-sm text-orange-300">
          Tài khoản của bạn chưa được gán quán nào — liên hệ ADMIN để được gán quán trước khi quản lý địa điểm.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-latte-100">Địa điểm Đà Lạt</h2>
          <p className="mt-1 text-sm text-latte-200/70">
            Quản lý địa điểm gợi ý cho tính năng &quot;Vi vu Đà Lạt&quot; — chỉ địa điểm{" "}
            <b className="text-emerald-300">đã duyệt</b> mới được đồng bộ xuống quán.
          </p>
        </div>
        {selectedStoreId && (
          <button
            onClick={openNew}
            className="shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm"
          >
            + Thêm địa điểm
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">Quán</label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
          >
            <option value="">— Chọn quán —</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {loadError}
        </div>
      )}

      {selectedStoreId && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((f) => (
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

          {locations === null && <p className="text-sm text-latte-400">Đang tải...</p>}
          {locations !== null && shown.length === 0 && !loadError && (
            <p className="text-sm text-latte-400">Không có địa điểm nào.</p>
          )}

          <div className="space-y-3">
            {shown.map((loc) => (
              <div key={loc.id} className="rounded-xl border border-latte-700 bg-latte-800/40 p-4">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <b className="text-sm font-bold text-latte-100">{loc.name}</b>
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide ${STATUS_BADGE[loc.status]}`}>
                    {STATUS_LABEL[loc.status]}
                  </span>
                  <span className="rounded-full bg-latte-700 px-2 py-0.5 text-[0.65rem] font-semibold text-latte-200">{loc.category}</span>
                </div>
                <p className="text-sm text-latte-200/80">{loc.description}</p>
                {loc.bestTimeToVisit && (
                  <p className="mt-1 text-xs text-latte-400">Thời điểm nên ghé: {loc.bestTimeToVisit}</p>
                )}
                {loc.relatedLocationIds.length > 0 && (
                  <p className="mt-1 text-xs text-latte-400">
                    Địa điểm liên quan:{" "}
                    {loc.relatedLocationIds
                      .map((id) => locations?.find((x) => x.id === id)?.name ?? id)
                      .join(", ")}
                  </p>
                )}
                <p className="mt-1.5 text-[0.7rem] text-latte-500">
                  Tạo bởi {loc.createdBy?.name ?? "?"} · {formatTime(loc.createdAt)}
                  {loc.reviewedBy && <> · Duyệt bởi {loc.reviewedBy.name}</>}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {loc.status !== "APPROVED" && (
                    <button
                      onClick={() => setStatus(loc, "APPROVED")}
                      className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Duyệt
                    </button>
                  )}
                  {loc.status !== "REJECTED" && (
                    <button
                      onClick={() => setStatus(loc, "REJECTED")}
                      className="rounded-full border border-latte-600 px-3 py-1 text-xs font-semibold text-latte-300 hover:bg-latte-700"
                    >
                      Từ chối
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(loc)}
                    className="rounded-full border border-orange-500/40 px-3 py-1 text-xs font-semibold text-orange-300 hover:bg-orange-500/10"
                  >
                    Sửa
                  </button>
                  <button onClick={() => handleDelete(loc)} className="rounded-full px-3 py-1 text-xs text-latte-400 hover:text-red-300">
                    Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4" onClick={() => setEditing(null)}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-latte-700 bg-latte-900 p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-latte-100">
                {editing === "new" ? "Thêm địa điểm" : "Sửa địa điểm"}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="text-latte-400 hover:text-latte-100">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">Tên địa điểm</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">Mô tả</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">Category</label>
                <input
                  type="text"
                  required
                  list="location-category-options"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="vd: thiên nhiên, check-in, ẩm thực, yên tĩnh"
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400"
                />
                <datalist id="location-category-options">
                  {categoryOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
                  Thời điểm nên ghé (tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={form.bestTimeToVisit}
                  onChange={(e) => setForm((f) => ({ ...f, bestTimeToVisit: e.target.value }))}
                  placeholder="vd: sáng sớm có sương"
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400"
                />
              </div>

              {(locations ?? []).filter((l) => editing === "new" || l.id !== (editing as Location).id).length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
                    Địa điểm liên quan (tuỳ chọn)
                  </label>
                  <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                    {(locations ?? [])
                      .filter((l) => editing === "new" || l.id !== (editing as Location).id)
                      .map((l) => {
                        const active = form.relatedLocationIds.includes(l.id);
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => toggleRelated(l.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              active
                                ? "border-orange-500 bg-orange-500/15 text-orange-300"
                                : "border-latte-700 text-latte-300 hover:border-latte-500"
                            }`}
                          >
                            {l.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {formError && <p className="mt-3 text-sm text-orange-300">{formError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-200 hover:bg-latte-800"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:opacity-50"
              >
                {submitting ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
