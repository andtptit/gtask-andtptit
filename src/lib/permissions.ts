import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getLeaderTeamIds, getProfile, getUser } from "@/lib/auth";

// Danh sách quyền — khớp ma trận phân quyền trong tài liệu
export const PERMS = [
  { key: "manage_org", label: "Tạo/sửa/xóa user, nhóm" },
  { key: "assign_any", label: "Giao việc cho bất kỳ ai" },
  { key: "assign_team", label: "Giao việc trong nhóm mình" },
  { key: "self_task", label: "Tự tạo việc cho bản thân" },
  { key: "edit_own_task", label: "Sửa/xóa việc mình tạo" },
  { key: "approve", label: "Duyệt việc hoàn thành (leader/member: nhóm mình)" },
  { key: "update_assigned_status", label: "Cập nhật trạng thái việc được giao" },
  { key: "view_reports_all", label: "Xem báo cáo toàn phòng" },
  { key: "view_reports_team", label: "Xem báo cáo nhóm mình" },
  { key: "view_others_tasks", label: "Xem việc của người khác" },
] as const;

export type PermKey = (typeof PERMS)[number]["key"];
export type PermRole = "admin" | "manager" | "leader" | "member";
export const EDITABLE_ROLES: PermRole[] = ["manager", "leader", "member"];

// Quyền mặc định (đúng ma trận trong phan-tich-tinh-nang.md)
export const DEFAULT_PERMS: Record<PermRole, Record<string, boolean>> = {
  admin: {
    manage_org: true, assign_any: true, assign_team: true, self_task: true,
    edit_own_task: true, approve: true, update_assigned_status: true,
    view_reports_all: true, view_reports_team: true, view_others_tasks: true,
  },
  manager: {
    manage_org: false, assign_any: true, assign_team: true, self_task: true,
    edit_own_task: true, approve: true, update_assigned_status: true,
    view_reports_all: true, view_reports_team: true, view_others_tasks: true,
  },
  leader: {
    manage_org: false, assign_any: false, assign_team: true, self_task: true,
    edit_own_task: true, approve: true, update_assigned_status: true,
    view_reports_all: false, view_reports_team: true, view_others_tasks: true,
  },
  member: {
    manage_org: false, assign_any: false, assign_team: false, self_task: true,
    edit_own_task: true, approve: false, update_assigned_status: true,
    view_reports_all: false, view_reports_team: false, view_others_tasks: true,
  },
};

// Đọc bảng role_permissions (fallback về mặc định nếu thiếu dòng)
export const getPermMap = cache(
  async (): Promise<Record<PermRole, Record<string, boolean>>> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("role_permissions")
      .select("role, perm, allowed");

    // clone defaults
    const map = JSON.parse(JSON.stringify(DEFAULT_PERMS)) as Record<
      PermRole,
      Record<string, boolean>
    >;
    for (const row of data || []) {
      const r = row.role as PermRole;
      if (map[r]) map[r][row.perm as string] = !!row.allowed;
    }
    // Admin luôn full quyền
    map.admin = { ...DEFAULT_PERMS.admin };
    return map;
  }
);

// Vai trò hiệu lực của user hiện tại (leader = đang lead >= 1 nhóm)
export const getMyPermRole = cache(async (): Promise<PermRole> => {
  const [me, leaderIds] = await Promise.all([getProfile(), getLeaderTeamIds()]);
  if (me?.role === "admin" || me?.role === "manager") return me.role;
  return leaderIds.length > 0 ? "leader" : "member";
});

// Các nhóm user hiện tại tham gia (phục vụ scope "nhóm mình")
export const getMyTeamIds = cache(async (): Promise<string[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);
  return (data || []).map((r) => r.team_id as string);
});

export async function hasPerm(perm: PermKey): Promise<boolean> {
  const role = await getMyPermRole();
  if (role === "admin") return true;
  const map = await getPermMap();
  return !!map[role]?.[perm];
}
