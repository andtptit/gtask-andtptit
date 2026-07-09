"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addComment(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const taskId = String(formData.get("task_id"));
  const content = String(formData.get("content") || "").trim();
  if (!content) return;

  await supabase
    .from("comments")
    .insert({ task_id: taskId, user_id: user.id, content });

  const [{ data: task }, { data: followerRows }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("title, assigner_id, assignee_id")
        .eq("id", taskId)
        .single(),
      supabase.from("task_followers").select("user_id").eq("task_id", taskId),
      supabase.from("profiles").select("id, name").eq("is_active", true),
    ]);

  if (!task) {
    revalidatePath(`/tasks/${taskId}`);
    return;
  }

  // @mention: tìm "@Tên" trong nội dung
  const mentioned = (profiles || [])
    .filter((p) => p.id !== user.id && p.name && content.includes(`@${p.name}`))
    .map((p) => p.id as string);

  const followers = (followerRows || []).map((r) => r.user_id as string);
  const others = Array.from(
    new Set([task.assigner_id, task.assignee_id, ...followers])
  ).filter((id) => id && id !== user.id && !mentioned.includes(id));

  const rows = [
    ...mentioned.map((user_id) => ({
      user_id,
      task_id: taskId,
      type: "mention",
      content: `Bạn được nhắc đến trong "${task.title}"`,
    })),
    ...others.map((user_id) => ({
      user_id,
      task_id: taskId,
      type: "comment",
      content: `Bình luận mới trong "${task.title}"`,
    })),
  ];
  if (rows.length > 0) await supabase.from("notifications").insert(rows);

  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteComment(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("comment_id"));
  const taskId = String(formData.get("task_id"));
  await supabase.from("comments").delete().eq("id", id);
  revalidatePath(`/tasks/${taskId}`);
}
