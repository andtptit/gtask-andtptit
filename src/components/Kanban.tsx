"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { moveTask } from "@/app/actions/tasks";
import { STATUS_LABELS, fmtDate, isOverdue } from "@/lib/constants";
import { PriorityBadge } from "./badges";
import type { Task } from "@/lib/types";

const COLUMNS = ["new", "doing", "review", "done"] as const;

export default function Kanban({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);

  function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    startTransition(async () => {
      const res = await moveTask(id, status);
      if (res?.error) alert(res.error);
      router.refresh();
    });
  }

  return (
    <div
      className={`grid grid-cols-1 gap-4 md:grid-cols-4 ${isPending ? "opacity-60" : ""}`}
    >
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, col)}
            className={`rounded-xl border p-3 ${
              dragOver === col
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-200 bg-gray-100/60"
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-gray-700">
                {STATUS_LABELS[col]}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                {colTasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {colTasks.map((t) => {
                const overdue = isOverdue(t);
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", t.id)
                    }
                    className={`cursor-grab rounded-lg border bg-white p-3 shadow-sm active:cursor-grabbing ${
                      overdue ? "border-red-300" : "border-gray-200"
                    }`}
                  >
                    <Link
                      href={`/tasks/${t.id}`}
                      className="block text-sm font-medium hover:text-indigo-600"
                    >
                      {t.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <PriorityBadge priority={t.priority} />
                      {t.team && <span>{t.team.name}</span>}
                      <span>👤 {t.assignee?.name}</span>
                      <span className={overdue ? "font-semibold text-red-600" : ""}>
                        {fmtDate(t.due_date)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-gray-400">
                  Kéo thẻ vào đây
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
