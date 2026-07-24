"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeTaskStatus } from "@/app/actions/tasks";
import { Spinner } from "./SubmitButton";

function ActionButton({
  busy,
  disabled,
  onClick,
  className = "btn-primary",
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${className} ${busy || disabled ? "pointer-events-none opacity-60" : ""}`}
      disabled={busy || disabled}
      onClick={onClick}
    >
      {busy && <Spinner />}
      {busy ? "Đang xử lý…" : children}
    </button>
  );
}

// Các nút chuyển trạng thái chính (Bắt đầu làm / Nộp duyệt / Duyệt / Trả lại):
// đổi UI ngay khi bấm (optimistic), gọi server ở nền, revert + báo lỗi nếu
// server từ chối. Cùng pattern với Kanban (kéo thả optimistic).
export default function TaskStatusActions({
  taskId,
  initialStatus,
  isAssignee,
  canApprove,
  hasResult,
}: {
  taskId: string;
  initialStatus: string;
  isAssignee: boolean;
  canApprove: boolean;
  hasResult: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState("");
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Đồng bộ nếu điều hướng sang task khác mà component không bị remount
  // (giống pattern trong Kanban)
  useEffect(() => setStatus(initialStatus), [initialStatus]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function go(target: string, noteArg?: string) {
    const prev = status;
    setStatus(target);
    setPendingTarget(target);
    startTransition(async () => {
      const res = await changeTaskStatus(taskId, target, noteArg);
      setPendingTarget(null);
      if (res.error) {
        setStatus(prev);
        showToast(res.error);
      } else {
        setNote("");
        router.refresh();
      }
    });
  }

  const anyBusy = pendingTarget !== null;

  return (
    <>
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 w-max max-w-[90vw] -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
      {status === "new" && isAssignee && (
        <ActionButton busy={pendingTarget === "doing"} disabled={anyBusy} onClick={() => go("doing")}>
          ▶ Bắt đầu làm
        </ActionButton>
      )}
      {status === "doing" && isAssignee && (
        <div className="flex flex-col gap-1">
          <ActionButton
            busy={pendingTarget === "review"}
            disabled={anyBusy || !hasResult}
            className={hasResult ? "btn-primary" : "btn-secondary"}
            onClick={() => go("review")}
          >
            📤 Nộp duyệt
          </ActionButton>
          {!hasResult && (
            <span className="text-xs text-amber-600">
              ⚠️ Điền &quot;Kết quả công việc&quot; hoặc đính kèm file trước khi
              nộp
            </span>
          )}
        </div>
      )}
      {status === "review" && canApprove && (
        <>
          <ActionButton busy={pendingTarget === "done"} disabled={anyBusy} onClick={() => go("done")}>
            ✅ Duyệt hoàn thành
          </ActionButton>
          <div className="flex items-center gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={anyBusy}
              className="input !w-56"
              placeholder="Lý do trả lại..."
            />
            <ActionButton
              busy={pendingTarget === "doing"}
              disabled={anyBusy}
              className="btn-secondary"
              onClick={() => go("doing", note)}
            >
              ↩ Trả lại
            </ActionButton>
          </div>
        </>
      )}
    </>
  );
}
