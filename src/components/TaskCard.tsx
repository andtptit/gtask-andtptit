import Link from "next/link";
import type { Task } from "@/lib/types";
import { fmtDate, isOverdue } from "@/lib/constants";
import { PriorityBadge, StatusBadge } from "./badges";
import LabelChips from "./LabelChips";

export default function TaskCard({
  task,
  showStatus = true,
}: {
  task: Task;
  showStatus?: boolean;
}) {
  const overdue = isOverdue(task);
  return (
    <Link
      href={`/tasks/${task.id}`}
      className={`card block hover:border-indigo-300 hover:shadow ${overdue ? "border-red-300" : ""}`}
    >
      {task.parent && (
        <div className="mb-1 truncate text-[11px] text-gray-400">
          ↳ Việc con của: <span className="text-gray-500">{task.parent.title}</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium leading-snug">{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {showStatus && <StatusBadge status={task.status} />}
        {task.team && (
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
            {task.team.name}
          </span>
        )}
        <LabelChips task={task} />
        <span>👤 {task.assignee?.name || "—"}</span>
        <span className={overdue ? "font-semibold text-red-600" : ""}>
          ⏰ {fmtDate(task.due_date)}
          {overdue && " (trễ hạn)"}
        </span>
      </div>
    </Link>
  );
}
