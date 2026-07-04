"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { ResourceConfig } from "@/components/admin/resource-configs";
import ImagePickerModal from "@/components/admin/ImagePickerModal";
import { imageUrl, MediaPurpose } from "@/lib/media";
import { ALL_TAG_OPTIONS } from "@/lib/tags";

type AnyItem = { id: string } & Record<string, unknown>;

export default function ResourcePanel({
  config,
}: {
  config: ResourceConfig<any>;
}) {
  const [items, setItems] = useState<AnyItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AnyItem | "new" | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pickerField, setPickerField] = useState<{ key: string; purpose: MediaPurpose } | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const data = await adminApi.list<AnyItem>(config.endpoint);
      setItems(data);
    } catch (err) {
      setItems([]);
      setLoadError(err instanceof AdminApiError ? err.message : "Không tải được dữ liệu.");
    }
  }

  useEffect(() => {
    setItems(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.endpoint]);

  function openCreate() {
    setEditing("new");
    setFormValues({ ...config.emptyValues });
    setFormError(null);
    setFieldErrors({});
  }

  function openEdit(item: AnyItem) {
    setEditing(item);
    setFormValues({ ...item });
    setFormError(null);
    setFieldErrors({});
  }

  function closeForm() {
    setEditing(null);
    setFormValues({});
    setFormError(null);
    setFieldErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      if (editing === "new") {
        await adminApi.create(config.endpoint, formValues);
      } else if (editing) {
        await adminApi.update(`${config.endpoint}/${editing.id}`, formValues);
      }
      closeForm();
      await load();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setFormError(err.message);
        const details = err.details as { fieldErrors?: Record<string, string[]> } | undefined;
        if (details?.fieldErrors) setFieldErrors(details.fieldErrors);
      } else {
        setFormError("Không gửi được yêu cầu.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: AnyItem) {
    const label = (item.name as string | undefined) ?? (item.title as string | undefined) ?? item.id;
    if (!window.confirm(`Xoá "${label}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await adminApi.remove(`${config.endpoint}/${item.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không xoá được.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-latte-100">{config.title}</h2>
          <p className="mt-1 text-sm text-latte-200/70">{config.description}</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm transition-shadow hover:shadow-neon-orange"
        >
          + Thêm mới
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {loadError}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-latte-700">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-latte-700 bg-latte-800/60 text-latte-200/80">
              {config.columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 font-mono text-[0.68rem] uppercase tracking-wider ${col.className ?? ""}`}>
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-mono text-[0.68rem] uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr>
                <td colSpan={config.columns.length + 1} className="px-4 py-8 text-center text-latte-400">
                  Đang tải...
                </td>
              </tr>
            )}
            {items !== null && items.length === 0 && !loadError && (
              <tr>
                <td colSpan={config.columns.length + 1} className="px-4 py-8 text-center text-latte-400">
                  Chưa có dữ liệu.
                </td>
              </tr>
            )}
            {items?.map((item) => (
              <tr key={item.id} className="border-b border-latte-800 last:border-0 hover:bg-latte-800/40">
                {config.columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-latte-100">
                    {col.render ? col.render(item) : String(item[col.key] ?? "")}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(item)} className="mr-3 text-orange-400 hover:text-orange-300">
                    Sửa
                  </button>
                  <button onClick={() => handleDelete(item)} className="text-latte-400 hover:text-orange-300">
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4" onClick={closeForm}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-latte-700 bg-latte-900 p-6 shadow-card"
          >
            <h3 className="mb-4 font-display text-lg font-bold text-latte-100">
              {editing === "new" ? `Thêm ${config.title.toLowerCase()}` : `Sửa: ${config.title}`}
            </h3>

            <div className="space-y-4">
              {config.fields.map((field) => {
                const value = formValues[field.key];
                const errs = fieldErrors[field.key];
                const baseInputClass =
                  "w-full rounded-lg border bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60 " +
                  (errs ? "border-orange-500/70" : "border-latte-700");

                return (
                  <div key={field.key}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
                      {field.label}
                      {"required" in field && field.required ? " *" : ""}
                    </label>

                    {field.type === "textarea" && (
                      <textarea
                        required={field.required}
                        value={(value as string) ?? ""}
                        onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        rows={3}
                        placeholder={field.placeholder}
                        className={baseInputClass}
                      />
                    )}

                    {field.type === "text" && (
                      <input
                        type="text"
                        required={field.required}
                        value={(value as string) ?? ""}
                        onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className={baseInputClass}
                      />
                    )}

                    {field.type === "number" && (
                      <input
                        type="number"
                        required={field.required}
                        min={field.min}
                        value={typeof value === "number" ? value : ""}
                        onChange={(e) =>
                          setFormValues((v) => ({ ...v, [field.key]: e.target.value === "" ? "" : Number(e.target.value) }))
                        }
                        className={baseInputClass}
                      />
                    )}

                    {field.type === "checkbox" && (
                      <label className="flex items-center gap-2 text-sm text-latte-100">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.checked }))}
                          className="h-4 w-4 accent-orange-500"
                        />
                        Có
                      </label>
                    )}

                    {field.type === "select" && (
                      <select
                        value={(value as string) ?? field.options[0]?.value}
                        onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        className={baseInputClass}
                      >
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === "image" && (
                      <div className="flex items-center gap-3">
                        {value ? (
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-latte-700">
                            <Image src={imageUrl(value as string)!} alt="" fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-latte-700 text-[0.6rem] text-latte-400">
                            Chưa có
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPickerField({ key: field.key, purpose: field.purpose })}
                            className="rounded-lg border border-latte-700 px-3 py-1.5 text-xs font-semibold text-latte-200 hover:bg-latte-800"
                          >
                            {value ? "Đổi ảnh" : "Chọn / tải ảnh"}
                          </button>
                          {value ? (
                            <button
                              type="button"
                              onClick={() => setFormValues((v) => ({ ...v, [field.key]: null }))}
                              className="text-left text-[0.68rem] text-latte-400 hover:text-orange-300"
                            >
                              Bỏ ảnh
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {field.type === "tags" && (
                      <div className="flex flex-wrap gap-2">
                        {ALL_TAG_OPTIONS.map((opt) => {
                          const current = (value as string[] | undefined) ?? [];
                          const active = current.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setFormValues((v) => {
                                  const list = (v[field.key] as string[] | undefined) ?? [];
                                  const next = active ? list.filter((t) => t !== opt.value) : [...list, opt.value];
                                  return { ...v, [field.key]: next };
                                })
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                active
                                  ? "border-orange-500 bg-orange-500/15 text-orange-300"
                                  : "border-latte-700 text-latte-300 hover:border-latte-500"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {errs && <p className="mt-1 text-xs text-orange-300">{errs.join(", ")}</p>}
                  </div>
                );
              })}
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-300">
                {formError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-latte-700 px-4 py-2 text-sm font-semibold text-latte-200 hover:bg-latte-800"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Đang lưu..." : editing === "new" ? "Tạo mới" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {pickerField && (
        <ImagePickerModal
          purpose={pickerField.purpose}
          currentId={formValues[pickerField.key] as string | null}
          onSelect={(id) => setFormValues((v) => ({ ...v, [pickerField.key]: id }))}
          onClose={() => setPickerField(null)}
        />
      )}
    </div>
  );
}
