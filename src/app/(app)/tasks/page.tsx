import { createClient } from "@/lib/supabase/server";
import TaskCard from "@/components/TaskCard";
import { STATUSES, STATUS_LABELS } from "@/lib/constants";
import { TASK_SELECT } from "@/lib/queries";
import type { Label, Profile, Task, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Filters {
  q?: string;
  team?: string;
  status?: string;
  assignee?: string;
  label?: string;
}

export default async function TaskListPage({
  searchParams,
}: {
  searchParams: Filters;
}) {
  const supabase = createClient();

  // Gộp cả query lọc nhãn vào cùng 1 lượt song song
  const [
    { data: teamsData },
    { data: usersData },
    { data: labelsData },
    { data: labelRows },
  ] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("profiles").select("*").eq("is_active", true).order("name"),
    supabase.from("labels").select("*").order("name"),
    searchParams.label
      ? supabase
          .from("task_labels")
          .select("task_id")
          .eq("label_id", searchParams.label)
      : Promise.resolve({ data: null }),
  ]);
  const teams = (teamsData || []) as Team[];
  const users = (usersData || []) as Profile[];
  const labels = (labelsData || []) as Label[];
  const labelTaskIds: string[] | null = searchParams.label
    ? ((labelRows || []) as { task_id: string }[]).map((r) => r.task_id)
    : null;

  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(200);

  if (searchParams.q) {
    const q = searchParams.q.replace(/[%,()]/g, " ").trim();
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (searchParams.team) query = query.eq("team_id", searchParams.team);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.assignee)
    query = query.eq("assignee_id", searchParams.assignee);
  if (labelTaskIds !== null) {
    if (labelTaskIds.length === 0) query = query.in("id", ["00000000-0000-0000-0000-000000000000"]);
    else query = query.in("id", labelTaskIds);
  }

  const { data: tasksData } = await query;
  const tasks = (tasksData || []) as unknown as Task[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Danh sách công việc</h1>

      <form className="card grid grid-cols-2 items-end gap-3 md:grid-cols-6">
        <div className="col-span-2">
          <label className="label">Tìm kiếm</label>
          <input
            name="q"
            className="input"
            placeholder="Tiêu đề, mô tả..."
            defaultValue={searchParams.q || ""}
          />
        </div>
        <div>
          <label className="label">Nhóm</label>
          <select name="team" className="input" defaultValue={searchParams.team || ""}>
            <option value="">Tất cả</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Trạng thái</label>
          <select
            name="status"
            className="input"
            defaultValue={searchParams.status || ""}
          >
            <option value="">Tất cả</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Người thực hiện</label>
          <select
            name="assignee"
            className="input"
            defaultValue={searchParams.assignee || ""}
          >
            <option value="">Tất cả</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nhãn</label>
          <select
            name="label"
            className="input"
            defaultValue={searchParams.label || ""}
          >
            <option value="">Tất cả</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex gap-2 md:col-span-6">
          <button className="btn-primary">Lọc</button>
          <a href="/tasks" className="btn-secondary">
            Xóa bộ lọc
          </a>
          <span className="ml-auto self-center text-sm text-gray-500">
            {tasks.length} việc
          </span>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
      {tasks.length === 0 && (
        <p className="py-8 text-center text-gray-400">
          Không tìm thấy việc nào khớp bộ lọc.
        </p>
      )}
    </div>
  );
}
