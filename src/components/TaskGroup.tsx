"use client";

import { useState } from "react";
import Link from "next/link";
import TaskCard from "./TaskCard";
import { PriorityBadge, StatusBadge } from "./badges";
import LabelChips from "./LabelChips";
import { fmtDate, isOverdue } from "@/lib/constants";
import { stripHtml } from "@/lib/sanitize";
import type { Task } from "@/lib/types";

// Popover xem nhanh chi tiết việc con khi hover
function SubtaskPreview({ task }: { task: Task }) {
  const overdue = isOverdue(task);
  return (
    <div className="pointer-events-none invisible absolute bottom-full left-0 z-20 mb-2 w-80 max-w-[85vw] rounded-xl border border-gray-200 bg-white p-3 text-xs opacity-0 shadow-xl transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-hover:delay-200">
      <p className="text-sm font-semibold leading-snug text-gray-900">
        {task.title}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {task.team && (
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
            {task.team.name}
          </span>
        )}
        <LabelChips task={task} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-gray-600">
        <span>
          <span className="text-gray-400">Người giao:</span>{" "}
          {task.assigner?.name || "—"}
        </span>
        <span>
          <span className="text-gray-400">Thực hiện:</span>{" "}
          {task.assignee?.name || "—"}
        </span>
        <span className="col-span-2">
          <span className="text-gray-400">Deadline:</span>{" "}
          <span className={overdue ? "font-semibold text-red-600" : ""}>
            {fmtDate(task.due_date)}
            {overdue && " (trễ hạn)"}
          </span>
        </span>
      </div>
      {(task.description || "").trim() && (
        <div className="mt-2 border-t border-gray-100 pt-2">
          <span className="text-gray-400">Mô tả:</span>
          <p className="line-clamp-3 whitespace-pre-wrap text-gray-700">
            {stripHtml(task.description || "")}
          </p>
        </div>
      )}
      <div className="mt-2 border-t border-gray-100 pt-2">
        <span className="text-gray-400">Kết quả:</span>{" "}
        {(task.result_note || "").trim() ? (
          <p className="line-clamp-2 whitespace-pre-wrap text-gray-700">
            {task.result_note}
          </p>
        ) : (
          <span className="text-amber-600">chưa có</span>
        )}
      </div>
      <p className="mt-2 text-[10px] text-gray-400">
        Bấm để mở trang chi tiết →
      </p>
    </div>
  );
}

// Thẻ việc cha + toggle xổ danh sách việc con (dạng tóm tắt, hover để xem nhanh)
export default function TaskGroup({
  task,
  subtasks,
}: {
  task: Task;
  subtasks: Task[];
}) {
  const [open, setOpen] = useState(false);

  if (subtasks.length === 0) {
    return <TaskCard task={task} />;
  }

  const done = subtasks.filter((s) => s.status === "done").length;

  return (
    <div className="flex flex-col">
      <TaskCard task={task} />
      <button
        onClick={() => setOpen(!open)}
        className="-mt-1 flex items-center gap-1.5 self-start rounded-b-lg border border-t-0 border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
        title={open ? "Thu gọn việc con" : "Xem việc con"}
      >
        <span
          className={`inline-block transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        {subtasks.length} việc con ({done}/{subtasks.length} xong)
      </button>

      {open && (
        <div className="page-enter ml-4 mt-1.5 flex flex-col gap-1.5 border-l-2 border-indigo-100 pl-3">
          {subtasks.map((s) => {
            const overdue = isOverdue(s);
            return (
              <div key={s.id} className="group relative">
                <SubtaskPreview task={s} />
                <Link
                  href={`/tasks/${s.id}`}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <StatusBadge status={s.status} />
                  <span className="min-w-0 flex-1 truncate font-medium text-gray-800">
                    {s.title}
                  </span>
                  <span className="shrink-0 text-gray-500">
                    👤 {s.assignee?.name || "—"}
                  </span>
                  <span
                    className={`shrink-0 ${
                      overdue ? "font-semibold text-red-600" : "text-gray-500"
                    }`}
                  >
                    {fmtDate(s.due_date)}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
