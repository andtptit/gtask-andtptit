import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import { APP_TZ, STATUS_COLORS } from "@/lib/constants";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CalTask {
  id: string;
  title: string;
  status: string;
  due_date: string;
  team: { id: string; name: string } | null;
  assignee: { name: string } | null;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; team?: string };
}) {
  const supabase = createClient();

  // Ngày "hôm nay" theo giờ VN (server chạy UTC), dạng "YYYY-MM-DD"
  const todayKey = new Date().toLocaleDateString("sv-SE", { timeZone: APP_TZ });

  // month dạng "2026-07"
  const [y, m] = (searchParams.month || todayKey.slice(0, 7))
    .split("-")
    .map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0, 23, 59, 59);

  // Lưới bắt đầu từ thứ 2 của tuần chứa ngày 1
  const gridStart = new Date(monthStart);
  const dow = (monthStart.getDay() + 6) % 7; // 0 = thứ 2
  gridStart.setDate(gridStart.getDate() - dow);

  const prevMonth = new Date(y, m - 2, 1);
  const nextMonth = new Date(y, m, 1);
  const fmtMonth = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const teamQ = searchParams.team ? `&team=${searchParams.team}` : "";

  const { data: teamsData } = await supabase
    .from("teams")
    .select("*")
    .order("name");
  const teams = (teamsData || []) as Team[];

  let query = supabase
    .from("tasks")
    .select(
      `id, title, status, due_date,
      team:teams(id,name),
      assignee:profiles!tasks_assignee_id_fkey(name)`
    )
    .gte("due_date", gridStart.toISOString())
    .lte("due_date", new Date(y, m, 14).toISOString())
    .neq("status", "cancelled")
    .order("due_date");
  if (searchParams.team) query = query.eq("team_id", searchParams.team);

  const { data: tasksData } = await query;
  const tasks = (tasksData || []) as unknown as CalTask[];

  // Nhóm theo ngày giờ VN (không dùng toDateString — sẽ lệch ngày theo UTC)
  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const byDay = new Map<string, CalTask[]>();
  for (const t of tasks) {
    const k = new Date(t.due_date).toLocaleDateString("sv-SE", {
      timeZone: APP_TZ,
    });
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(t);
  }

  // 6 tuần x 7 ngày
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresher />
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">
          Lịch công việc — {String(m).padStart(2, "0")}/{y}
        </h1>
        <div className="ml-auto flex gap-2">
          <Link
            href={`/calendar?month=${fmtMonth(prevMonth)}${teamQ}`}
            className="btn-secondary"
          >
            ← Tháng trước
          </Link>
          <Link href={`/calendar${teamQ ? `?team=${searchParams.team}` : ""}`} className="btn-secondary">
            Hôm nay
          </Link>
          <Link
            href={`/calendar?month=${fmtMonth(nextMonth)}${teamQ}`}
            className="btn-secondary"
          >
            Tháng sau →
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/calendar?month=${y}-${String(m).padStart(2, "0")}`}
          className={`rounded-full px-3 py-1 text-sm ${
            !searchParams.team
              ? "bg-indigo-600 text-white"
              : "border border-gray-300 bg-white hover:bg-gray-50"
          }`}
        >
          Tất cả
        </Link>
        {teams.map((t) => (
          <Link
            key={t.id}
            href={`/calendar?month=${y}-${String(m).padStart(2, "0")}&team=${t.id}`}
            className={`rounded-full px-3 py-1 text-sm ${
              searchParams.team === t.id
                ? "bg-indigo-600 text-white"
                : "border border-gray-300 bg-white hover:bg-gray-50"
            }`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-7 gap-px rounded-xl border border-gray-200 bg-gray-200">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="bg-gray-50 px-2 py-1.5 text-center text-xs font-semibold text-gray-600"
            >
              {d}
            </div>
          ))}
          {days.map((d) => {
            const inMonth = d.getMonth() === m - 1;
            const isToday = dayKey(d) === todayKey;
            const dayTasks = byDay.get(dayKey(d)) || [];
            return (
              <div
                key={d.toISOString()}
                className={`min-h-[96px] p-1.5 ${inMonth ? "bg-white" : "bg-gray-50"}`}
              >
                <div
                  className={`mb-1 text-right text-xs ${
                    isToday
                      ? "font-bold text-indigo-600"
                      : inMonth
                        ? "text-gray-600"
                        : "text-gray-300"
                  }`}
                >
                  {d.getDate()}
                </div>
                <div className="flex flex-col gap-1">
                  {dayTasks.slice(0, 3).map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks/${t.id}`}
                      title={`${t.title} — ${t.assignee?.name || ""}`}
                      className={`truncate rounded px-1.5 py-0.5 text-[11px] leading-tight hover:opacity-75 ${
                        STATUS_COLORS[t.status] || "bg-gray-100"
                      }`}
                    >
                      {t.team ? `[${t.team.name}] ` : ""}
                      {t.title}
                    </Link>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="px-1 text-[10px] text-gray-400">
                      +{dayTasks.length - 3} việc khác
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Task hiển thị theo deadline. Chọn nhóm Content để dùng như Content
        Calendar.
      </p>
    </div>
  );
}
