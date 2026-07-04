"use client";

import { useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { SessionUser } from "@/lib/auth-types";

export default function LoginForm({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const user = await adminApi.create<SessionUser>("/api/auth/login", {
        email: email.trim(),
        password,
      });
      if (user) onLogin(user);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Không kết nối được tới server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-latte-950 px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-latte-700 bg-latte-900 p-8 shadow-card"
      >
        <span className="eyebrow mb-3 text-orange-400">Quản trị</span>
        <h1 className="font-display text-2xl font-extrabold text-latte-100">Đăng nhập admin</h1>
        <p className="mt-2 mb-6 text-sm text-latte-200/75">
          Đăng nhập bằng tài khoản được cấp — mỗi người 1 tài khoản riêng, quyền truy cập tuỳ theo được cấp.
        </p>

        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">Email</label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@cbdaicafe.vn"
          className="mb-4 w-full rounded-lg border border-latte-700 bg-latte-800 px-3.5 py-2.5 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
        />

        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latte-200/80">Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-latte-700 bg-latte-800 px-3.5 py-2.5 text-sm text-latte-100 placeholder:text-latte-400 focus:border-orange-500/60"
        />

        {error && <p className="mt-3 text-sm text-orange-300">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="mt-5 w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 py-2.5 text-sm font-bold text-latte-950 shadow-neon-orange-sm transition-shadow hover:shadow-neon-orange disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
