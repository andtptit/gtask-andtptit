import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

  const { data: teamsData } = await supabase
    .from("teams")
    .select("*")
    .order("name");
  const teams = (teamsData || []) as Team[];
  const activeTeam = searchParams.team || "";

  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .neq("status", "cancelled")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (activeTeam) query = query.eq("team_id", activeTeam);

  const { data: tasksData } = await query;
  const tasks = (tasksData || []) as unknown as Task[];

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
      <Kanban tasks={tasks} />
    </div>
  );
}
