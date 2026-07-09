import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { createTask } from "@/app/actions/tasks";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import SubmitButton from "@/components/SubmitButton";
import type { Profile, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: { error?: string; parent?: string };
}) {
  const supabase = createClient();
  const user = await getUser();
  const [{ data: teamsData }, { data: usersData }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase
      .from("profiles")
      .select("*")
      .eq("is_active", true)
      .order("name"),
  ]);
  const teams = (teamsData || []) as Team[];
  const users = (usersData || []) as Profile[];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold">Giao việc mới</h1>
      {searchParams.error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}
      <form action={createTask} className="card flex flex-col gap-4">
        {searchParams.parent && (
          <input type="hidden" name="parent_task_id" value={searchParams.parent} />
        )}
        <div>
          <label className="label">Tiêu đề *</label>
          <input name="title" className="input" required autoFocus />
        </div>
        <div>
          <label className="label">Mô tả / Brief</label>
          <textarea name="description" className="input" rows={4} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nhóm</label>
            <select name="team_id" className="input">
              <option value="">— Không thuộc nhóm —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Người thực hiện *</label>
            {/* Mặc định giao cho chính mình — tránh giao nhầm người đầu danh sách */}
            <select
              name="assignee_id"
              className="input"
              required
              defaultValue={user?.id}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === user?.id ? `${u.name} (tôi)` : u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Độ ưu tiên</label>
            <select name="priority" className="input" defaultValue="medium">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Deadline</label>
            <input type="datetime-local" name="due_date" className="input" />
          </div>
        </div>
        <SubmitButton className="btn-primary justify-center">
          Giao việc
        </SubmitButton>
      </form>
    </div>
  );
}
