import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getUser } from "@/lib/auth";
import { getMyPermRole, getMyTeamIds, getPermMap } from "@/lib/permissions";
import { signOut } from "@/app/actions/auth";
import NavLinks from "@/components/NavLinks";
import NotificationBell from "@/components/NotificationBell";
import { ROLE_LABELS } from "@/lib/constants";
import type { Notification } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const [me, permRole, permMap, myTeams, { data: notifs }] = await Promise.all([
    getProfile(),
    getMyPermRole(),
    getPermMap(),
    getMyTeamIds(),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Tài khoản bị vô hiệu hóa (Active = off) → đăng xuất + chặn truy cập
  if (me && me.is_active === false) redirect("/login?disabled=1");

  const notifications = (notifs || []) as Notification[];
  const isAdmin = me?.role === "admin" || me?.role === "manager";
  // Phân quyền động: hiện menu Báo cáo theo quyền được cấp
  const can = (p: string) =>
    permRole === "admin" || !!permMap[permRole]?.[p];
  const canSeeReports =
    can("view_reports_all") ||
    (can("view_reports_team") && myTeams.length > 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            GTask
          </Link>
          <NavLinks canSeeReports={canSeeReports} isAdmin={isAdmin} />
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell userId={user.id} notifications={notifications} />
            <Link
              href="/account"
              className="rounded-lg px-2 py-1 text-right text-sm leading-tight hover:bg-gray-100"
              title="Tài khoản / đổi mật khẩu"
            >
              <div className="font-medium">{me?.name || user.email}</div>
              <div className="text-xs text-gray-500">
                {ROLE_LABELS[me?.role || "member"]}
              </div>
            </Link>
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
