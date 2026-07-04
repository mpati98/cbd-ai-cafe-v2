"use client";

import { useEffect, useState } from "react";
import LoginForm from "@/components/admin/LoginForm";
import AdminShell from "@/components/admin/AdminShell";
import { adminApi, AdminApiError } from "@/lib/admin-api";
import { SessionUser } from "@/lib/auth-types";

export default function AdminPage() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined); // undefined = đang kiểm tra phiên

  useEffect(() => {
    adminApi
      .get<SessionUser>("/api/auth/me")
      .then((u) => setUser(u))
      .catch((err) => {
        if (err instanceof AdminApiError && err.status !== 401) {
          console.error("[admin] /api/auth/me error:", err.message);
        }
        setUser(null);
      });
  }, []);

  if (user === undefined) {
    return <div className="min-h-screen bg-latte-950" />;
  }

  if (!user) {
    return <LoginForm onLogin={setUser} />;
  }

  return <AdminShell user={user} onLogout={() => setUser(null)} />;
}
