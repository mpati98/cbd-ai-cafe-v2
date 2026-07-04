"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { resourceConfigs } from "@/components/admin/resource-configs";
import ResourcePanel from "@/components/admin/ResourcePanel";
import MediaLibraryPanel from "@/components/admin/MediaLibraryPanel";
import OrdersPanel from "@/components/admin/OrdersPanel";
import UsersPanel from "@/components/admin/UsersPanel";
import TablesPanel from "@/components/admin/TablesPanel";
import { adminApi } from "@/lib/admin-api";
import { SessionUser, userHasPermission } from "@/lib/auth-types";

const MEDIA_TAB_KEY = "media-library";
const ORDERS_TAB_KEY = "orders";
const USERS_TAB_KEY = "users";
const TABLES_TAB_KEY = "tables";

export default function AdminShell({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "unconfigured" | "unreachable">("checking");

  const visibleResourceConfigs = useMemo(
    () => resourceConfigs.filter((c) => userHasPermission(user, c.permission)),
    [user]
  );
  const canOrders = userHasPermission(user, "orders");
  const canMedia = userHasPermission(user, "media");
  const canTables = userHasPermission(user, "tables");
  const isAdmin = user.role === "ADMIN";

  const firstTabKey = canOrders
    ? ORDERS_TAB_KEY
    : visibleResourceConfigs[0]?.key ?? (canMedia ? MEDIA_TAB_KEY : canTables ? TABLES_TAB_KEY : isAdmin ? USERS_TAB_KEY : "");
  const [activeKey, setActiveKey] = useState(firstTabKey);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .health()
      .then((res) => {
        if (!cancelled) setDbStatus((res?.db as typeof dbStatus) ?? "unreachable");
      })
      .catch(() => {
        if (!cancelled) setDbStatus("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    try {
      await adminApi.create("/api/auth/logout", {});
    } catch {
      // đăng xuất phía client dù API lỗi — cookie hết hạn tự nhiên sau 7 ngày
    }
    onLogout();
  }

  const active = resourceConfigs.find((c) => c.key === activeKey);

  const statusLabel: Record<typeof dbStatus, string> = {
    checking: "Đang kiểm tra...",
    connected: "Neon: đã kết nối",
    unconfigured: "Neon: chưa cấu hình",
    unreachable: "Neon: không kết nối được",
  };
  const statusColor: Record<typeof dbStatus, string> = {
    checking: "bg-latte-400",
    connected: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
    unconfigured: "bg-orange-400",
    unreachable: "bg-red-400",
  };

  function tabButton(key: string, label: string) {
    return (
      <button
        key={key}
        onClick={() => setActiveKey(key)}
        className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
          key === activeKey ? "bg-orange-500/15 text-orange-300" : "text-latte-200/80 hover:bg-latte-800 hover:text-latte-100"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex min-h-screen bg-latte-950">
      <aside className="flex w-64 shrink-0 flex-col border-r border-latte-800 bg-latte-900 px-4 py-6">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <Image src="/logo.webp" alt="CBD AI Cafe" width={32} height={32} className="rounded-[8px]" />
          <div className="leading-none">
            <b className="font-display text-sm font-black text-latte-100">CBD AI CAFE</b>
            <span className="block font-mono text-[0.55rem] uppercase tracking-[0.2em] text-orange-400">Quản trị</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {canOrders && tabButton(ORDERS_TAB_KEY, "📦 Đơn hàng & Thống kê")}
          {(canOrders || visibleResourceConfigs.length > 0) && <div className="my-2 border-t border-latte-800" />}
          {visibleResourceConfigs.map((c) => tabButton(c.key, c.title))}
          {canMedia && (
            <>
              <div className="my-2 border-t border-latte-800" />
              {tabButton(MEDIA_TAB_KEY, "🖼 Thư viện ảnh")}
            </>
          )}
          {canTables && (
            <>
              <div className="my-2 border-t border-latte-800" />
              {tabButton(TABLES_TAB_KEY, "🪑 Bàn & QR")}
            </>
          )}
          {isAdmin && (
            <>
              <div className="my-2 border-t border-latte-800" />
              {tabButton(USERS_TAB_KEY, "👤 Người dùng")}
            </>
          )}
        </nav>

        <div className="mt-4 border-t border-latte-800 pt-4">
          <p className="truncate px-2 text-sm font-semibold text-latte-100">{user.name}</p>
          <p className="truncate px-2 text-xs text-latte-400">
            {user.email} · {user.role}
          </p>
          <a href="/" target="_blank" rel="noreferrer" className="mt-2 block rounded-lg px-2 py-2 text-sm text-latte-400 hover:text-orange-300">
            ↗ Xem trang chủ
          </a>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-latte-800 bg-latte-900/60 px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-latte-200/80">
            <span className={`h-2 w-2 rounded-full ${statusColor[dbStatus]}`} />
            {statusLabel[dbStatus]}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-latte-700 px-3.5 py-1.5 text-xs font-semibold text-latte-200 hover:bg-latte-800"
          >
            Đăng xuất
          </button>
        </header>

        <main className="p-6 sm:p-8">
          {activeKey === ORDERS_TAB_KEY && canOrders ? (
            <OrdersPanel />
          ) : activeKey === MEDIA_TAB_KEY && canMedia ? (
            <MediaLibraryPanel />
          ) : activeKey === TABLES_TAB_KEY && canTables ? (
            <TablesPanel />
          ) : activeKey === USERS_TAB_KEY && isAdmin ? (
            <UsersPanel currentUser={user} />
          ) : active ? (
            <ResourcePanel key={active.key} config={active} />
          ) : (
            <p className="text-sm text-latte-400">
              Tài khoản của bạn chưa được cấp quyền truy cập mục nào. Liên hệ ADMIN để được cấp quyền.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
