import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLeaderTeamIds, getProfile, getUser } from "@/lib/auth";
import Kanban from "@/components/Kanban";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import { TASK_SELECT } from "@/lib/queries";
import type { Task, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: { team?: string };
}) {
  const supabase = createClient();
  const user = await getUser(); // dedupe với layout
  const activeTeam = searchParams.team || "";

  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .neq("status", "cancelled")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (activeTeam) query = query.eq("team_id", activeTeam);

  // 1 lượt song song duy nhất (profile + leader đã được cache chung với layout)
  const [me, leaderIds, { data: teamsData }, { data: tasksData }] =
    await Promise.all([
      getProfile(),
      getLeaderTeamIds(),
      supabase.from("teams").select("*").order("name"),
      query,
    ]);

  const teams = (teamsData || []) as Team[];
  const isManager = !!me && ["admin", "manager"].includes(me.role);
  const leaderTeamIds = new Set(leaderIds);
  const tasks = (tasksData || []) as unknown as Task[];

  // Task nào user hiện tại được duyệt (kéo vào/ra cột Hoàn thành)
  const approvableIds = isManager
    ? tasks.map((t) => t.id)
    : tasks
        .filter(
          (t) =>
            t.assigner_id === user!.id ||
            (t.team_id !== null && leaderTeamIds.has(t.team_id))
        )
        .map((t) => t.id);

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresher />
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-xl font-bold">Bảng Kanban</h1>
        <Link
          href="/board"
          className={`rounded-full px-3 py-1 text-sm ${
            !activeTeam
              ? "bg-indigo-600 text-white"
              : "bg-white border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Tất cả
        </Link>
        {teams.map((t) => (
          <Link
            key={t.id}
            href={`/board?team=${t.id}`}
            className={`rounded-full px-3 py-1 text-sm ${
              activeTeam === t.id
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {t.name}
          </Link>
        ))}
      </div>
      <Kanban tasks={tasks} approvableIds={approvableIds} />
    </div>
  );
}
