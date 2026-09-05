"use client";

import { useEffect, useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { PERMISSIONS, PermissionKey } from "@/lib/permissions";
import { SessionUser } from "@/lib/auth-types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
  permissions: string[];
  createdAt: string;
};

const emptyForm = {
  email: "",
  name: "",
  password: "",
  role: "STAFF" as "ADMIN" | "STAFF",
  permissions: [] as PermissionKey[],
};

export default function UsersPanel({ currentUser }: { currentUser: SessionUser }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const data = await adminApi.list<UserRow>("/api/users");
      setUsers(data);
    } catch (err) {
      setUsers([]);
      setLoadError(err instanceof AdminApiError ? err.message : "Không tải được danh sách người dùng.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(emptyForm);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(u: UserRow) {
    setForm({ email: u.email, name: u.name, password: "", role: u.role, permissions: u.permissions as PermissionKey[] });
    setFormError(null);
    setEditing(u);
  }

  function togglePermission(key: PermissionKey) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await adminApi.create("/api/users", {
          email: form.email.trim(),
          name: form.name.trim(),
          password: form.password,
          role: form.role,
          permissions: form.permissions,
        });
      } else if (editing) {
        const patch: Record<string, unknown> = {
          name: form.name.trim(),
          role: form.role,
          permissions: form.permissions,
        };
        if (form.password) patch.password = form.password;
        await adminApi.update(`/api/users/${editing.id}`, patch);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Không lưu được.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(u: UserRow) {
    if (!window.confirm(`Xoá tài khoản "${u.name}" (${u.email})? Không thể hoàn tác.`)) return;
    try {
      await adminApi.remove(`/api/users/${u.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : "Không xoá được tài khoản.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-latte-100">Người dùng</h2>
          <p className="mt-1 text-sm text-latte-200/70">
            Tạo tài khoản cho nhân viên, cấp quyền theo từng tab. ADMIN luôn có toàn quyền.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-latte-950 shadow-neon-orange-sm"
        >
          + Thêm người dùng
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {loadError}
        </div>
      )}

      {users === null && <p className="text-sm text-latte-400">Đang tải...</p>}

      <div className="space-y-3">
        {users?.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-latte-700 bg-latte-800/40 p-4">
            <div>
              <div className="flex items-center gap-2">
                <b className="text-sm font-bold text-latte-100">{u.name}</b>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide ${
                    u.role === "ADMIN" ? "bg-orange-500/15 text-orange-300" : "bg-latte-700 text-latte-200"
                  }`}
                >
                  {u.role}
                </span>
                {u.id === currentUser.id && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-emerald-300">
                    Bạn
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-latte-400">{u.email}</p>
              {u.role === "STAFF" && (
                <p className="mt-1.5 text-xs text-latte-300">
                  Quyền:{" "}
                  {u.permissions.length
                    ? u.permissions.map((p) => PERMISSIONS.find((x) => x.key === p)?.label ?? p).join(", ")
                    : "chưa có quyền nào"}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(u)}
                className="rounded-full border border-orange-500/40 px-4 py-1.5 text-xs font-semibold text-orange-300 hover:bg-orange-500/10"
              >
                Sửa
              </button>
              {u.id !== currentUser.id && (
                <button onClick={() => handleDelete(u)} className="text-xs text-latte-400 hover:text-orange-300">
                  Xoá
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4" onClick={() => setEditing(null)}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-latte-700 bg-latte-900 p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-latte-100">
                {editing === "new" ? "Thêm người dùng" : "Sửa người dùng"}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="text-latte-400 hover:text-latte-100">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">Email</label>
                <input
                  type="email"
                  required
                  disabled={editing !== "new"}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">Tên</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
                  Mật khẩu {editing !== "new" && "(để trống nếu không đổi)"}
                </label>
                <input
                  type="password"
                  required={editing === "new"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3 py-2 text-sm text-latte-100 placeholder:text-latte-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">Vai trò</label>
                <div className="flex gap-2">
                  {(["STAFF", "ADMIN"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: r }))}
                      className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-semibold ${
                        form.role === r ? "border-orange-500 bg-orange-500/10 text-orange-300" : "border-latte-700 text-latte-300"
                      }`}
                    >
                      {r === "ADMIN" ? "ADMIN — toàn quyền" : "STAFF — theo quyền cấp"}
                    </button>
                  ))}
                </div>
              </div>

              {form.role === "STAFF" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">
                    Quyền truy cập tab
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PERMISSIONS.map((p) => {
                      const active = form.permissions.includes(p.key);
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => togglePermission(p.key)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            active
                              ? "border-orange-500 bg-orange-500/15 text-orange-300"
                              : "border-latte-700 text-latte-300 hover:border-latte-500"
                          }`}
                        >
                          {p.label}
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
