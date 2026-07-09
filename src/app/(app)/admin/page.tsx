import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addTeamMember,
  createMember,
  removeTeamMember,
  toggleLeader,
  updateUser,
} from "@/app/actions/admin";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

interface MemberRow {
  team_id: string;
  user_id: string;
  is_leader: boolean;
  profile: { id: string; name: string } | null;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (!me || !["admin", "manager"].includes(me.role)) redirect("/");

  const [{ data: usersData }, { data: teamsData }, { data: membersData }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
      supabase
        .from("team_members")
        .select("team_id, user_id, is_leader, profile:profiles(id,name)"),
    ]);

  const users = (usersData || []) as Profile[];
  const teams = (teamsData || []) as Team[];
  const members = (membersData || []) as unknown as MemberRow[];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold">Quản trị</h1>

      {searchParams.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}
      {searchParams.ok && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {searchParams.ok}
        </p>
      )}

      {/* Thêm thành viên mới (admin) */}
      {me.role === "admin" && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">
            Thêm thành viên mới
          </h2>
          <form
            action={createMember}
            className="card grid grid-cols-2 items-end gap-3 md:grid-cols-5"
          >
            <div>
              <label className="label">Họ tên *</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" name="email" className="input" required />
            </div>
            <div>
              <label className="label">Mật khẩu mặc định</label>
              <input
                name="password"
                className="input"
                placeholder="GTask@123"
                minLength={6}
              />
            </div>
            <div>
              <label className="label">Vai trò</label>
              <select name="role" className="input" defaultValue="member">
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary justify-center">+ Tạo tài khoản</button>
            <p className="col-span-2 text-xs text-gray-500 md:col-span-5">
              Tài khoản được kích hoạt ngay (không cần xác nhận email). Nếu bỏ
              trống mật khẩu, hệ thống dùng <code>GTask@123</code>. Cần cấu hình{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> trong biến môi trường.
            </p>
          </form>
        </section>
      )}

      {/* Thành viên */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">
          Thành viên ({users.length})
        </h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2">Họ tên</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Chức danh</th>
                <th className="px-4 py-2">Vai trò</th>
                <th className="px-4 py-2">Hoạt động</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2 text-gray-500">{u.email}</td>
                  <td colSpan={4} className="px-2 py-2">
                    <form
                      action={updateUser}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="user_id" value={u.id} />
                      <input
                        name="title"
                        className="input !w-36"
                        defaultValue={u.title || ""}
                        placeholder="Chức danh"
                      />
                      <select
                        name="role"
                        className="input !w-36"
                        defaultValue={u.role}
                      >
                        {Object.entries(ROLE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          name="is_active"
                          defaultChecked={u.is_active}
                        />
                        Active
                      </label>
                      <button className="btn-secondary !px-2 !py-1 text-xs">
                        Lưu
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Thành viên mới tự đăng ký tại trang đăng nhập, sau đó admin gán vào
          nhóm tại đây.
        </p>
      </section>

      {/* Nhóm */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Nhóm</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {teams.map((team) => {
            const teamMembers = members.filter((m) => m.team_id === team.id);
            const memberIds = new Set(teamMembers.map((m) => m.user_id));
            const available = users.filter(
              (u) => !memberIds.has(u.id) && u.is_active
            );
            return (
              <div key={team.id} className="card">
                <h3 className="font-semibold">{team.name}</h3>
                <p className="mb-3 text-xs text-gray-500">{team.description}</p>
                <div className="flex flex-col gap-2">
                  {teamMembers.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-2 py-1.5 text-sm"
                    >
                      <span>
                        {m.is_leader && "⭐ "}
                        {m.profile?.name}
                      </span>
                      <span className="flex gap-2 text-xs">
                        <form action={toggleLeader}>
                          <input type="hidden" name="team_id" value={team.id} />
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <input
                            type="hidden"
                            name="make_leader"
                            value={m.is_leader ? "0" : "1"}
                          />
                          <button className="text-indigo-600 hover:underline">
                            {m.is_leader ? "Bỏ leader" : "Làm leader"}
                          </button>
                        </form>
                        <form action={removeTeamMember}>
                          <input type="hidden" name="team_id" value={team.id} />
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <button className="text-red-500 hover:underline">
                            Xóa
                          </button>
                        </form>
                      </span>
                    </div>
                  ))}
                  {teamMembers.length === 0 && (
                    <p className="text-xs text-gray-400">Chưa có thành viên</p>
                  )}
                </div>
                {available.length > 0 && (
                  <form action={addTeamMember} className="mt-3 flex gap-2">
                    <input type="hidden" name="team_id" value={team.id} />
                    <select name="user_id" className="input text-xs">
                      {available.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <button className="btn-secondary shrink-0 !px-2 text-xs">
                      + Thêm
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
