"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createLabel(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await supabase.from("labels").insert({
    name,
    color: String(formData.get("color") || "#6366f1"),
  });
  revalidatePath(`/tasks/${String(formData.get("task_id"))}`);
}

export async function setTaskLabels(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  const labelIds = formData.getAll("label_ids").map(String);

  await supabase.from("task_labels").delete().eq("task_id", taskId);
  if (labelIds.length > 0) {
    await supabase
      .from("task_labels")
      .insert(labelIds.map((label_id) => ({ task_id: taskId, label_id })));
  }
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/board");
  revalidatePath("/tasks");
}

export async function toggleFollow(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const taskId = String(formData.get("task_id"));
  const { data: existing } = await supabase
    .from("task_followers")
    .select("task_id")
    .eq("task_id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("task_followers")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("task_followers")
      .insert({ task_id: taskId, user_id: user.id });
  }
  revalidatePath(`/tasks/${taskId}`);
}
