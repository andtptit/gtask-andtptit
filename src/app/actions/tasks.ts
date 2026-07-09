"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS } from "@/lib/constants";

type Supa = ReturnType<typeof createClient>;

async function notify(
  supabase: Supa,
  userIds: (string | null | undefined)[],
  exclude: string,
  taskId: string,
  type: string,
  content: string
) {
  const targets = Array.from(
    new Set(userIds.filter((u): u is string => !!u && u !== exclude))
  );
  if (targets.length === 0) return;
  await supabase.from("notifications").insert(
    targets.map((user_id) => ({ user_id, task_id: taskId, type, content }))
  );
}

async function getFollowers(supabase: Supa, taskId: string): Promise<string[]> {
  const { data } = await supabase
    .from("task_followers")
    .select("user_id")
    .eq("task_id", taskId);
  return (data || []).map((r) => r.user_id as string);
}

export async function createTask(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  const payload = {
    title,
    description: String(formData.get("description") || ""),
    team_id: String(formData.get("team_id") || "") || null,
    assignee_id: String(formData.get("assignee_id") || user.id),
    assigner_id: user.id,
    priority: String(formData.get("priority") || "medium"),
    due_date: String(formData.get("due_date") || "") || null,
    parent_task_id: String(formData.get("parent_task_id") || "") || null,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("id, title")
    .single();

  if (error || !data) {
    redirect(
      `/tasks/new?error=${encodeURIComponent(error?.message || "Không tạo được việc")}`
    );
  }

  await notify(
    supabase,
    [payload.assignee_id],
    user.id,
    data.id,
    "assigned",
    `Bạn được giao việc: "${data.title}"`
  );

  revalidatePath("/");
  revalidatePath("/board");
  redirect(`/tasks/${data.id}`);
}

export async function changeStatus(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const taskId = String(formData.get("task_id"));
  const status = String(formData.get("status"));
  const note = String(formData.get("note") || "").trim();

  const update: Record<string, unknown> = { status };
  update.completed_at = status === "done" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .select("id, title, assigner_id, assignee_id")
    .single();

  if (error || !data) {
    revalidatePath(`/tasks/${taskId}`);
    return;
  }

  if (note) {
    await supabase.from("comments").insert({
      task_id: taskId,
      user_id: user.id,
      content: `[Trả lại] ${note}`,
    });
  }

  const followers = await getFollowers(supabase, taskId);
  await notify(
    supabase,
    [data.assigner_id, data.assignee_id, ...followers],
    user.id,
    taskId,
    "status",
    `"${data.title}" chuyển sang: ${STATUS_LABELS[status] || status}`
  );

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
  revalidatePath("/board");
}

export async function moveTask(taskId: string, status: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  const update: Record<string, unknown> = { status };
  update.completed_at = status === "done" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .select("id, title, assigner_id, assignee_id");

  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Bạn không có quyền cập nhật việc này" };

  const followers = await getFollowers(supabase, taskId);
  await notify(
    supabase,
    [data[0].assigner_id, data[0].assignee_id, ...followers],
    user.id,
    taskId,
    "status",
    `"${data[0].title}" chuyển sang: ${STATUS_LABELS[status] || status}`
  );

  revalidatePath("/board");
  revalidatePath("/");
  return {};
}

export async function updateTask(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));

  const payload = {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || ""),
    team_id: String(formData.get("team_id") || "") || null,
    assignee_id: String(formData.get("assignee_id")),
    priority: String(formData.get("priority") || "medium"),
    due_date: String(formData.get("due_date") || "") || null,
  };
  if (!payload.title) return;

  await supabase.from("tasks").update(payload).eq("id", taskId);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
  revalidatePath("/board");
}

export async function deleteTask(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/");
  revalidatePath("/board");
  redirect("/");
}
