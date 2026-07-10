import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/lib/types";

// LƯU Ý: không embed self-join (parent:tasks!...) vào select này —
// PostgREST coi quan hệ tasks↔tasks là nhập nhằng và trả lỗi,
// làm MỌI query task trả về rỗng. Dùng attachParents() bên dưới thay thế.
export const TASK_SELECT = `*,
  assignee:profiles!tasks_assignee_id_fkey(id,name),
  assigner:profiles!tasks_assigner_id_fkey(id,name),
  team:teams(id,name),
  task_labels(label:labels(id,name,color))`;

// Gắn tiêu đề việc cha cho các task con bằng 1 query phụ (an toàn với self-join)
export async function attachParents(
  supabase: SupabaseClient,
  tasks: Task[]
): Promise<Task[]> {
  const parentIds = Array.from(
    new Set(
      tasks
        .map((t) => t.parent_task_id)
        .filter((id): id is string => !!id)
    )
  );
  if (parentIds.length === 0) return tasks;

  const { data } = await supabase
    .from("tasks")
    .select("id, title")
    .in("id", parentIds);

  const map = new Map(
    ((data || []) as { id: string; title: string }[]).map((r) => [r.id, r])
  );
  return tasks.map((t) =>
    t.parent_task_id
      ? { ...t, parent: map.get(t.parent_task_id) || null }
      : t
  );
}
