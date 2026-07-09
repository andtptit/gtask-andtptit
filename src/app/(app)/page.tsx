import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import TaskCard from "@/components/TaskCard";
import { TASK_SELECT } from "@/lib/queries";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const supabase = createClient();
  const user = await getUser(); // dedupe với layout — không gọi mạng lần 2

  const [{ data: mine }, { data: waitingReview }] = await Promise.all([
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("assignee_id", user!.id)
      .not("status", "in", "(done,cancelled)")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("assigner_id", user!.id)
      .eq("status", "review")
      .order("updated_at", { ascending: false }),
  ]);

  const tasks = (mine || []) as unknown as Task[];
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
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold">Việc của tôi</h1>

      {tasks.length === 0 && (
        <p className="text-gray-500">
          Bạn chưa có việc nào đang mở. Tuyệt vời! 🎉
        </p>
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
