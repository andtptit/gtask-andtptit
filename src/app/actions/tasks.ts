"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, dueDateToUtc } from "@/lib/constants";

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

// Nộp duyệt phải có kết quả: note hoặc file đính kèm (DB cũng enforce bằng trigger)
async function hasResult(supabase: Supa, taskId: string): Promise<boolean> {
  const [{ data: task }, { count }] = await Promise.all([
    supabase.from("tasks").select("result_note").eq("id", taskId).single(),
    supabase
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("task_id", taskId),
  ]);
  return !!(task?.result_note || "").trim() || (count || 0) > 0;
}

const MISSING_RESULT_MSG =
  "Cần điền Kết quả công việc hoặc đính kèm file kết quả trước khi nộp duyệt.";

const PAST_DEADLINE_MSG = "Deadline không được đặt ở quá khứ.";

// Deadline ở quá khứ (chừa 1 phút sai số) → từ chối
function isPastDeadline(dueStr: string | null): boolean {
  if (!dueStr) return false;
  const due = new Date(dueStr);
  if (isNaN(due.getTime())) return false;
  return due.getTime() < Date.now() - 60 * 1000;
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
    due_date: dueDateToUtc(String(formData.get("due_date") || "")),
    parent_task_id: String(formData.get("parent_task_id") || "") || null,
  };

  // Chặn deadline ở quá khứ (áp dụng cả việc cha lẫn task con)
  if (isPastDeadline(payload.due_date)) {
    const parentQ = payload.parent_task_id
      ? `&parent=${payload.parent_task_id}`
      : "";
    redirect(
      `/tasks/new?error=${encodeURIComponent(PAST_DEADLINE_MSG)}${parentQ}`
    );
  }

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

  if (status === "review" && !(await hasResult(supabase, taskId))) {
    redirect(`/tasks/${taskId}?error=${encodeURIComponent(MISSING_RESULT_MSG)}`);
  }

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

  if (status === "review" && !(await hasResult(supabase, taskId))) {
    return { error: MISSING_RESULT_MSG };
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const taskId = String(formData.get("task_id"));

  const payload = {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || ""),
    team_id: String(formData.get("team_id") || "") || null,
    assignee_id: String(formData.get("assignee_id")),
    priority: String(formData.get("priority") || "medium"),
    due_date: dueDateToUtc(String(formData.get("due_date") || "")),
  };
  if (!payload.title) return;

  // Lấy bản cũ để so sánh deadline + biết người liên quan trước khi đổi
  const { data: old } = await supabase
    .from("tasks")
    .select("title, assigner_id, assignee_id, due_date")
    .eq("id", taskId)
    .single();

  // Chỉ chặn khi deadline BỊ ĐỔI sang quá khứ (không chặn sửa field khác
  // trên task cũ đã trễ hạn) — DB trigger cũng enforce tương tự
  if (isPastDeadline(payload.due_date)) {
    const oldDue = old?.due_date ? new Date(old.due_date).getTime() : null;
    const newDue = new Date(payload.due_date!).getTime();
    if (oldDue !== newDue) {
      redirect(
        `/tasks/${taskId}?error=${encodeURIComponent(PAST_DEADLINE_MSG)}`
      );
    }
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId)
    .select("id, title");

  if (error) {
    redirect(`/tasks/${taskId}?error=${encodeURIComponent(error.message)}`);
  }

  // Thông báo cho MỌI người liên quan: người giao, người thực hiện
  // (cũ + mới nếu bị đổi), người theo dõi — trừ chính người sửa
  if (updated && updated.length > 0) {
    const followers = await getFollowers(supabase, taskId);
    await notify(
      supabase,
      [old?.assigner_id, old?.assignee_id, payload.assignee_id, ...followers],
      user.id,
      taskId,
      "edited",
      `✏️ "${payload.title}" vừa được cập nhật thông tin`
    );
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
  revalidatePath("/board");
}

export async function updateResultNote(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const taskId = String(formData.get("task_id"));
  const result_note = String(formData.get("result_note") || "").trim();

  const { data } = await supabase
    .from("tasks")
    .update({ result_note })
    .eq("id", taskId)
    .select("id, title, assigner_id, assignee_id");

  if (data && data.length > 0 && result_note) {
    const followers = await getFollowers(supabase, taskId);
    await notify(
      supabase,
      [data[0].assigner_id, ...followers],
      user.id,
      taskId,
      "result",
      `"${data[0].title}" đã cập nhật kết quả công việc`
    );
  }

  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteTask(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const taskId = String(formData.get("task_id"));

  // Lấy thông tin người liên quan TRƯỚC khi xóa (xóa xong là mất)
  const [{ data: task }, followers, { data: me }] = await Promise.all([
    supabase
      .from("tasks")
      .select("title, assigner_id, assignee_id")
      .eq("id", taskId)
      .single(),
    getFollowers(supabase, taskId),
    supabase.from("profiles").select("name").eq("id", user.id).single(),
  ]);

  // RLS chỉ cho người giao việc hoặc admin xóa — kiểm tra kết quả thật
  const { data: deleted, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .select("id");

  if (error || !deleted || deleted.length === 0) {
    redirect(
      `/tasks/${taskId}?error=${encodeURIComponent(
        error?.message || "Chỉ người giao việc hoặc admin được xóa task."
      )}`
    );
  }

  // Thông báo người liên quan (task_id để null vì task đã bị xóa)
  if (task) {
    const targets = Array.from(
      new Set(
        [task.assigner_id, task.assignee_id, ...followers].filter(
          (id) => id && id !== user.id
        )
      )
    );
    if (targets.length > 0) {
      await supabase.from("notifications").insert(
        targets.map((user_id) => ({
          user_id,
          task_id: null,
          type: "deleted",
          content: `🗑 Task "${task.title}" đã bị xóa bởi ${me?.name || "quản trị"}`,
        }))
      );
    }
  }

  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath("/tasks");
  redirect("/");
}
