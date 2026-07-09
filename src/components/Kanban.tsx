"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { moveTask } from "@/app/actions/tasks";
import { STATUS_LABELS, fmtDate, isOverdue } from "@/lib/constants";
import { PriorityBadge } from "./badges";
import type { Task } from "@/lib/types";

const COLUMNS = ["new", "doing", "review", "done"] as const;

export default function Kanban({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<Task[]>(tasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [justDropped, setJustDropped] = useState<string | null>(null);

  // Đồng bộ khi server refresh (realtime / điều hướng)
  useEffect(() => setItems(tasks), [tasks]);

  function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    setDragOver(null);
    setDraggingId(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const current = items.find((t) => t.id === id);
    if (!current || current.status === status) return;

    // Optimistic: chuyển thẻ ngay, revert nếu server từ chối
    const prev = items;
    setItems(items.map((t) => (t.id === id ? { ...t, status } : t)));
    setJustDropped(id);
    setTimeout(() => setJustDropped(null), 600);

    startTransition(async () => {
      const res = await moveTask(id, status);
      if (res?.error) {
        alert(res.error);
        setItems(prev);
      }
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {COLUMNS.map((col) => {
        const colTasks = items.filter((t) => t.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, col)}
            className={`kanban-col ${
              dragOver === col
                ? "kanban-col-over"
                : "border-gray-200 bg-gray-100/60"
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-gray-700">
                {STATUS_LABELS[col]}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 transition-all">
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
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingId(t.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={`kanban-card ${
                      overdue ? "border-red-300" : "border-gray-200"
                    } ${draggingId === t.id ? "kanban-card-dragging" : ""} ${
                      justDropped === t.id ? "kanban-card-dropped" : ""
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
                <p
                  className={`rounded-lg border-2 border-dashed px-1 py-6 text-center text-xs transition-colors ${
                    dragOver === col
                      ? "border-indigo-300 text-indigo-500"
                      : "border-transparent text-gray-400"
                  }`}
                >
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
