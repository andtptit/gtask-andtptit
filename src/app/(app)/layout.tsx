import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { markAllRead } from "@/app/actions/notifications";
import { ROLE_LABELS } from "@/lib/constants";
import type { Notification, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: notifs }, { data: leaderRows }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("is_leader", true),
    ]);

  const me = profile as Profile | null;
  const notifications = (notifs || []) as Notification[];
  const unread = notifications.filter((n) => !n.is_read).length;
  const isAdmin = me?.role === "admin" || me?.role === "manager";
  const canSeeReports = isAdmin || (leaderRows || []).length > 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            GTask
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/" className="rounded-lg px-3 py-1.5 hover:bg-gray-100">
              Việc của tôi
            </Link>
            <Link
              href="/board"
              className="rounded-lg px-3 py-1.5 hover:bg-gray-100"
            >
              Kanban
            </Link>
            <Link
              href="/tasks"
              className="rounded-lg px-3 py-1.5 hover:bg-gray-100"
            >
              Danh sách
            </Link>
            <Link
              href="/calendar"
              className="rounded-lg px-3 py-1.5 hover:bg-gray-100"
            >
              Lịch
            </Link>
            {canSeeReports && (
              <Link
                href="/reports"
                className="rounded-lg px-3 py-1.5 hover:bg-gray-100"
              >
                Báo cáo
              </Link>
            )}
            <Link
              href="/tasks/new"
              className="rounded-lg px-3 py-1.5 hover:bg-gray-100"
            >
              + Giao việc
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 hover:bg-gray-100"
              >
                Quản trị
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center rounded-lg px-2 py-1.5 hover:bg-gray-100">
                <span>🔔</span>
                {unread > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {unread}
                  </span>
                )}
              </summary>
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-sm font-semibold">Thông báo</span>
                  {unread > 0 && (
                    <form action={markAllRead}>
                      <button className="text-xs text-indigo-600 hover:underline">
                        Đánh dấu đã đọc
                      </button>
                    </form>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="px-2 py-4 text-center text-sm text-gray-400">
                      Chưa có thông báo
                    </p>
                  )}
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.task_id ? `/tasks/${n.task_id}` : "/"}
                      className={`block rounded-lg px-2 py-2 text-sm hover:bg-gray-50 ${
                        n.is_read ? "text-gray-500" : "font-medium"
                      }`}
                    >
                      {n.content}
                      <span className="block text-xs text-gray-400">
                        {new Date(n.created_at).toLocaleString("vi-VN")}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </details>
            <div className="text-right text-sm leading-tight">
              <div className="font-medium">{me?.name || user.email}</div>
              <div className="text-xs text-gray-500">
                {ROLE_LABELS[me?.role || "member"]}
              </div>
            </div>
            <form action={signOut}>
              <button className="btn-secondary" title="Đăng xuất">
                Thoát
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
