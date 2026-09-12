"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/print-photos-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Sai mật khẩu.");
      }
      router.push(searchParams.get("next") || "/ops/print-photos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xs rounded-2xl border border-latte-700 bg-latte-800/40 p-6"
    >
      <h1 className="font-display text-lg font-bold text-latte-100">Đăng nhập nhân viên</h1>
      <p className="mt-1 mb-5 text-sm text-latte-200/70">Nhập mật khẩu để xem/in ảnh lưu niệm của khách.</p>

      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mật khẩu"
        className="w-full rounded-lg border border-latte-700 bg-latte-900 px-3.5 py-2.5 text-sm text-latte-100 outline-none focus:border-orange-500/60"
      />

      {error && <p className="mt-2.5 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !password}
        className="mt-4 w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 py-2.5 text-sm font-bold text-latte-950 shadow-neon-orange-sm transition-transform enabled:hover:scale-[1.02] disabled:opacity-50"
      >
        {submitting ? "Đang kiểm tra..." : "Đăng nhập"}
      </button>
    </form>
  );
}

export default function OpsPrintPhotosLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-latte-950 p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
