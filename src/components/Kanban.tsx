"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { moveTask } from "@/app/actions/tasks";
import { STATUS_LABELS, fmtDate, isOverdue } from "@/lib/constants";
import { PriorityBadge } from "./badges";
import LabelChips from "./LabelChips";
import type { Task } from "@/lib/types";

const COLUMNS = ["new", "doing", "review", "done"] as const;

export default function Kanban({
  tasks,
  approvableIds,
}: {
  tasks: Task[];
  approvableIds: string[];
}) {
  const router = useRouter();
  const approvable = new Set(approvableIds);
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<Task[]>(tasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [justDropped, setJustDropped] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Đồng bộ khi server refresh (realtime / điều hướng)
  useEffect(() => setItems(tasks), [tasks]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    setDragOver(null);
    setDraggingId(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const current = items.find((t) => t.id === id);
    if (!current || current.status === status) return;

    // Chuyển vào/ra "Hoàn thành" cần quyền duyệt (DB cũng enforce bằng trigger)
    if (
      (status === "done" || current.status === "done") &&
      !approvable.has(id)
    ) {
      showToast(
        "Chỉ người giao việc, quản lý hoặc leader nhóm được duyệt hoàn thành. Hãy kéo vào cột Chờ duyệt để nộp."
      );
      return;
    }

    // Optimistic: chuyển thẻ ngay, revert nếu server từ chối
    const prev = items;
    setItems(items.map((t) => (t.id === id ? { ...t, status } : t)));
    setJustDropped(id);
    setTimeout(() => setJustDropped(null), 600);

    startTransition(async () => {
      const res = await moveTask(id, status);
      if (res?.error) {
        showToast(res.error);
        setItems(prev);
      }
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 w-max max-w-[90vw] -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
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
                    {t.parent && (
                      <Link
                        href={`/tasks/${t.parent.id}`}
                        className="mb-0.5 block truncate text-[11px] text-gray-400 hover:text-indigo-500"
                        title={`Việc cha: ${t.parent.title}`}
                      >
                        ↳ Việc con của: {t.parent.title}
                      </Link>
                    )}
                    <Link
                      href={`/tasks/${t.id}`}
                      className="block text-sm font-medium hover:text-indigo-600"
                    >
                      {t.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <PriorityBadge priority={t.priority} />
                      <LabelChips task={t} />
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
