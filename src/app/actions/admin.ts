"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_PERMS,
  EDITABLE_ROLES,
  PERMS,
  type PermRole,
} from "@/lib/permissions";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || me.role !== "admin") {
    redirect("/admin?error=" + encodeURIComponent("Chỉ admin được thao tác này."));
  }
  return supabase;
}

// Lưu ma trận phân quyền (checkbox: name = `${role}__${perm}`)
export async function savePermissions(formData: FormData) {
  const supabase = await requireAdmin();

  const rows: { role: string; perm: string; allowed: boolean }[] = [];
  for (const role of EDITABLE_ROLES) {
    for (const p of PERMS) {
      rows.push({
        role,
        perm: p.key,
        allowed: formData.get(`${role}__${p.key}`) === "on",
      });
    }
  }
  const { error } = await supabase
    .from("role_permissions")
    .upsert(rows, { onConflict: "role,perm" });

  revalidatePath("/", "layout");
  redirect(
    error
      ? "/admin?error=" + encodeURIComponent(`Không lưu được: ${error.message}`)
      : "/admin?ok=" + encodeURIComponent("Đã lưu phân quyền.")
  );
}

// Reset quyền về mặc định theo ma trận
export async function resetPermissions() {
  const supabase = await requireAdmin();

  const rows: { role: string; perm: string; allowed: boolean }[] = [];
  const allRoles: PermRole[] = ["admin", ...EDITABLE_ROLES];
  for (const role of allRoles) {
    for (const p of PERMS) {
      rows.push({ role, perm: p.key, allowed: !!DEFAULT_PERMS[role][p.key] });
    }
  }
  const { error } = await supabase
    .from("role_permissions")
    .upsert(rows, { onConflict: "role,perm" });

  revalidatePath("/", "layout");
  redirect(
    error
      ? "/admin?error=" + encodeURIComponent(`Không reset được: ${error.message}`)
      : "/admin?ok=" + encodeURIComponent("Đã khôi phục quyền mặc định.")
  );
}

// Xóa user — CHỈ cho phép khi user chưa phát sinh task / bình luận / file
// (dành cho tài khoản tạo nhầm; user đã hoạt động thì bỏ tick Active thay vì xóa)
export async function deleteMember(formData: FormData) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = String(formData.get("user_id"));
  if (!userId) return;
  if (user && userId === user.id) {
    redirect("/admin?error=" + encodeURIComponent("Không thể tự xóa chính mình."));
  }

  // Đếm dữ liệu đã phát sinh
  const [asAssigner, asAssignee, comments, attachments] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assigner_id", userId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", userId),
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("uploaded_by", userId),
  ]);
  const total =
    (asAssigner.count || 0) +
    (asAssignee.count || 0) +
    (comments.count || 0) +
    (attachments.count || 0);

  if (total > 0) {
    redirect(
      "/admin?error=" +
        encodeURIComponent(
          `Không thể xóa: user đã phát sinh ${total} bản ghi (task/bình luận/file). Hãy bỏ tick Active để vô hiệu hóa thay vì xóa.`
        )
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    redirect("/admin?error=" + encodeURIComponent((e as Error).message));
  }

  // Xóa tài khoản auth → cascade sang profiles/team_members/followers/notifications.
  // Nếu có dữ liệu phát sinh đúng lúc này, FK sẽ chặn và trả lỗi (an toàn tuyệt đối).
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    redirect(
      "/admin?error=" + encodeURIComponent(`Không xóa được: ${error.message}`)
    );
  }

  revalidatePath("/admin");
  redirect("/admin?ok=" + encodeURIComponent("Đã xóa user."));
}

export async function updateUser(formData: FormData) {
  const supabase = createClient();
  const userId = String(formData.get("user_id"));
  await supabase
    .from("profiles")
    .update({
      role: String(formData.get("role")),
      is_active: formData.get("is_active") === "on",
      title: String(formData.get("title") || ""),
    })
    .eq("id", userId);
  revalidatePath("/admin");
}

export async function createMember(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Chỉ admin được tạo thành viên
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || me.role !== "admin") {
    redirect("/admin?error=" + encodeURIComponent("Chỉ admin được tạo thành viên."));
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const customPassword = String(formData.get("password") || "").trim();
  const password = customPassword || "GTask@123";
  const role = String(formData.get("role") || "member");
  if (!email || !name) return;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    redirect("/admin?error=" + encodeURIComponent((e as Error).message));
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    redirect("/admin?error=" + encodeURIComponent(`Không tạo được: ${error.message}`));
  }

  if (data.user && role !== "member") {
    await admin.from("profiles").update({ role }).eq("id", data.user.id);
  }

  revalidatePath("/admin");
  // Không đưa mật khẩu vào URL (lọt vào history / log server)
  const pwNote = customPassword
    ? "với mật khẩu bạn đã nhập"
    : "với mật khẩu mặc định GTask@123";
  redirect(
    "/admin?ok=" +
      encodeURIComponent(
        `Đã tạo ${email} ${pwNote}. Nhắc thành viên đổi mật khẩu sau khi đăng nhập.`
      )
  );
}

export async function addTeamMember(formData: FormData) {
  const supabase = createClient();
  const team_id = String(formData.get("team_id"));
  const user_id = String(formData.get("user_id"));
  if (!user_id) return;
  await supabase.from("team_members").insert({ team_id, user_id });
  revalidatePath("/admin");
}

export async function removeTeamMember(formData: FormData) {
  const supabase = createClient();
  await supabase
    .from("team_members")
    .delete()
    .eq("team_id", String(formData.get("team_id")))
    .eq("user_id", String(formData.get("user_id")));
  revalidatePath("/admin");
}

export async function toggleLeader(formData: FormData) {
  const supabase = createClient();
  await supabase
    .from("team_members")
    .update({ is_leader: formData.get("make_leader") === "1" })
    .eq("team_id", String(formData.get("team_id")))
    .eq("user_id", String(formData.get("user_id")));
  revalidatePath("/admin");
}
