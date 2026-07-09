import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RTask {
  id: string;
  status: string;
  team_id: string | null;
  assignee_id: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  assignee: { name: string } | null;
}

interface Stat {
  name: string;
  total: number;
  done: number;
  onTime: number;
  doneWithDue: number;
  overdueOpen: number;
}

function buildStats(tasks: RTask[], key: (t: RTask) => string): Stat[] {
  const map = new Map<string, Stat>();
  const now = new Date();
  for (const t of tasks) {
    const name = key(t);
    if (!map.has(name))
      map.set(name, { name, total: 0, done: 0, onTime: 0, doneWithDue: 0, overdueOpen: 0 });
    const s = map.get(name)!;
    s.total++;
    if (t.status === "done") {
      s.done++;
      if (t.due_date) {
        s.doneWithDue++;
        if (t.completed_at && new Date(t.completed_at) <= new Date(t.due_date))
          s.onTime++;
      }
    } else if (
      t.status !== "cancelled" &&
      t.due_date &&
      new Date(t.due_date) < now
    ) {
      s.overdueOpen++;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function StatTable({ title, stats }: { title: string; stats: Stat[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-600">{title}</h2>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2 text-right">Tổng việc</th>
              <th className="px-4 py-2 text-right">Hoàn thành</th>
              <th className="px-4 py-2 text-right">Đúng hạn</th>
              <th className="px-4 py-2 text-right">Đang trễ hạn</th>
              <th className="w-1/3 px-4 py-2">Tỷ lệ đúng hạn</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const rate =
                s.doneWithDue > 0
                  ? Math.round((s.onTime / s.doneWithDue) * 100)
                  : null;
              return (
                <tr key={s.name} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 text-right">{s.total}</td>
                  <td className="px-4 py-2 text-right">{s.done}</td>
                  <td className="px-4 py-2 text-right">
                    {s.onTime}/{s.doneWithDue}
                  </td>
                  <td
                    className={`px-4 py-2 text-right ${s.overdueOpen > 0 ? "font-semibold text-red-600" : ""}`}
                  >
                    {s.overdueOpen}
                  </td>
                  <td className="px-4 py-2">
                    {rate === null ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-gray-100">
                          <div
                            className={`h-2 rounded-full ${
                              rate >= 80
                                ? "bg-green-500"
                                : rate >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-medium">
                          {rate}%
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {stats.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Chưa có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function ReportsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  // Leader cũng được xem (giới hạn dữ liệu theo RLS select-all → lọc phía dưới nếu cần)
  const { data: leaderTeams } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user!.id)
    .eq("is_leader", true);
  const isManager = me && ["admin", "manager"].includes(me.role);
  const leaderTeamIds = (leaderTeams || []).map((r) => r.team_id as string);
  if (!isManager && leaderTeamIds.length === 0) redirect("/");

  const [{ data: teamsData }, { data: tasksData }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase
      .from("tasks")
      .select(
        `id, status, team_id, assignee_id, due_date, completed_at, created_at,
        assignee:profiles!tasks_assignee_id_fkey(name)`
      )
      .limit(5000),
  ]);
  const teams = (teamsData || []) as Team[];
  let tasks = (tasksData || []) as unknown as RTask[];

  // Leader (không phải manager): chỉ xem nhóm mình
  if (!isManager) {
    tasks = tasks.filter((t) => t.team_id && leaderTeamIds.includes(t.team_id));
  }

  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const teamStats = buildStats(
    tasks.filter((t) => t.team_id),
    (t) => teamName.get(t.team_id!) || "Khác"
  );
  const personStats = buildStats(tasks, (t) => t.assignee?.name || "Không rõ");

  // Khối lượng việc 6 tháng gần nhất (theo tháng tạo)
  const months: { key: string; label: string; created: number; done: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      created: 0,
      done: 0,
    });
  }
  const monthMap = new Map(months.map((m) => [m.key, m]));
  for (const t of tasks) {
    const c = new Date(t.created_at);
    const ck = `${c.getFullYear()}-${c.getMonth()}`;
    if (monthMap.has(ck)) monthMap.get(ck)!.created++;
    if (t.completed_at) {
      const f = new Date(t.completed_at);
      const fk = `${f.getFullYear()}-${f.getMonth()}`;
      if (monthMap.has(fk)) monthMap.get(fk)!.done++;
    }
  }
  const maxMonth = Math.max(1, ...months.map((m) => Math.max(m.created, m.done)));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold">Báo cáo hiệu suất</h1>

      <StatTable title="Theo nhóm" stats={teamStats} />
      <StatTable title="Theo cá nhân" stats={personStats} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">
          Khối lượng việc 6 tháng gần nhất
        </h2>
        <div className="card">
          <div className="flex items-end gap-4" style={{ height: 180 }}>
            {months.map((mo) => (
              <div key={mo.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <div
                    className="w-1/3 rounded-t bg-indigo-400"
                    style={{ height: `${(mo.created / maxMonth) * 100}%` }}
                    title={`Được tạo: ${mo.created}`}
                  />
                  <div
                    className="w-1/3 rounded-t bg-green-400"
                    style={{ height: `${(mo.done / maxMonth) * 100}%` }}
                    title={`Hoàn thành: ${mo.done}`}
                  />
                </div>
                <span className="text-xs text-gray-500">{mo.label}</span>
                <span className="text-[10px] text-gray-400">
                  {mo.created} / {mo.done}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-400" />
              Việc được tạo
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-400" />
              Việc hoàn thành
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
