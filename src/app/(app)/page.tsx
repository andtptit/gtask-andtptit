import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import TaskCard from "@/components/TaskCard";
import { TASK_SELECT, attachParents } from "@/lib/queries";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "mine", label: "Tôi thực hiện" },
  { key: "assigned", label: "Tôi giao việc" },
  { key: "follow", label: "Tôi theo dõi" },
] as const;

const EMPTY_MSG: Record<string, string> = {
  mine: "Bạn chưa có việc nào đang mở. Tuyệt vời! 🎉",
  assigned: "Bạn chưa giao việc nào đang mở.",
  follow: "Bạn chưa theo dõi việc nào đang mở. Bấm 🔔 Theo dõi trong task để nhận cập nhật.",
};

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const supabase = createClient();
  const user = await getUser(); // dedupe với layout — không gọi mạng lần 2
  const view = ["assigned", "follow"].includes(searchParams.view || "")
    ? (searchParams.view as "assigned" | "follow")
    : "mine";

  // Lọc nhanh: tôi thực hiện / tôi giao / tôi theo dõi
  let taskQuery = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .not("status", "in", "(done,cancelled)")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (view === "mine") {
    taskQuery = taskQuery.eq("assignee_id", user!.id);
  } else if (view === "assigned") {
    taskQuery = taskQuery.eq("assigner_id", user!.id);
  } else {
    const { data: followRows } = await supabase
      .from("task_followers")
      .select("task_id")
      .eq("user_id", user!.id);
    const ids = (followRows || []).map((r) => r.task_id as string);
    taskQuery = taskQuery.in(
      "id",
      ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]
    );
  }

  const [{ data: mine }, { data: waitingReview }] = await Promise.all([
    taskQuery,
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("assigner_id", user!.id)
      .eq("status", "review")
      .order("updated_at", { ascending: false }),
  ]);

  const tasks = await attachParents(
    supabase,
    (mine || []) as unknown as Task[]
  );
  const review = ((waitingReview || []) as unknown as Task[]).filter(
    (t) => t.assignee_id !== user!.id
  );

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const overdue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now
  );
  const today = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date) >= now &&
      new Date(t.due_date) <= endOfToday
  );
  const thisWeek = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date) > endOfToday &&
      new Date(t.due_date) <= endOfWeek
  );
  const later = tasks.filter(
    (t) => !t.due_date || new Date(t.due_date) > endOfWeek
  );

  const sections: [string, Task[]][] = [
    ["🔴 Trễ hạn", overdue],
    ["📌 Hôm nay", today],
    ["📅 Tuần này", thisWeek],
    ["🗂 Sau đó / chưa có hạn", later],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-xl font-bold">Việc của tôi</h1>
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "mine" ? "/" : `/?view=${v.key}`}
            className={`rounded-full px-3 py-1 text-sm ${
              view === v.key
                ? "bg-indigo-600 text-white"
                : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {tasks.length === 0 && (
        <p className="text-gray-500">{EMPTY_MSG[view]}</p>
      )}

      {sections.map(
        ([title, list]) =>
          list.length > 0 && (
            <section key={title}>
              <h2 className="mb-3 text-sm font-semibold text-gray-600">
                {title} ({list.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          )
      )}

      {review.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">
            ✅ Chờ tôi duyệt ({review.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {review.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
