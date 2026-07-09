"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const password = String(formData.get("password") || "").trim() || "GTask@123";
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
  redirect(
    "/admin?ok=" +
      encodeURIComponent(`Đã tạo ${email} (mật khẩu: ${password}). Nhắc thành viên đổi mật khẩu sau khi đăng nhập.`)
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
