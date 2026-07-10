import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { getMyPermRole, getMyTeamIds, getPermMap } from "@/lib/permissions";
import Kanban from "@/components/Kanban";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import { TASK_SELECT, attachParents } from "@/lib/queries";
import type { Task, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: { team?: string; sub?: string };
}) {
  const supabase = createClient();
  const user = await getUser(); // dedupe với layout
  const activeTeam = searchParams.team || "";
  const hideSub = searchParams.sub === "hide";

  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .neq("status", "cancelled")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (activeTeam) query = query.eq("team_id", activeTeam);
  if (hideSub) query = query.is("parent_task_id", null);

  // 1 lượt song song duy nhất (profile + leader đã được cache chung với layout)
  const [permRole, permMap, myTeams, { data: teamsData }, { data: tasksData }] =
    await Promise.all([
      getMyPermRole(),
      getPermMap(),
      getMyTeamIds(),
      supabase.from("teams").select("*").order("name"),
      query,
    ]);

  const teams = (teamsData || []) as Team[];
  const tasks = await attachParents(
    supabase,
    (tasksData || []) as unknown as Task[]
  );

  // Task nào user hiện tại được duyệt (kéo vào/ra cột Hoàn thành)
  // — theo phân quyền động: quyền 'approve' (manager: mọi nhóm;
  //   leader/member: nhóm mình); người giao việc luôn được duyệt
  const canApprovePerm =
    permRole === "admin" || !!permMap[permRole]?.approve;
  const myTeamSet = new Set(myTeams);
  const approvableIds = tasks
    .filter(
      (t) =>
        t.assigner_id === user!.id ||
        (canApprovePerm &&
          (permRole === "admin" ||
            permRole === "manager" ||
            (t.team_id !== null && myTeamSet.has(t.team_id))))
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
            href={`/board?team=${t.id}${hideSub ? "&sub=hide" : ""}`}
            className={`rounded-full px-3 py-1 text-sm ${
              activeTeam === t.id
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {t.name}
          </Link>
        ))}
        <Link
          href={`/board?${activeTeam ? `team=${activeTeam}` : ""}${
            hideSub ? "" : `${activeTeam ? "&" : ""}sub=hide`
          }`}
          className={`ml-auto rounded-full border px-3 py-1 text-sm ${
            hideSub
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          }`}
          title="Ẩn/hiện các task con trên bảng"
        >
          {hideSub ? "☑ Đang ẩn task con" : "☐ Ẩn task con"}
        </Link>
      </div>
      <Kanban tasks={tasks} approvableIds={approvableIds} />
    </div>
  );
}
