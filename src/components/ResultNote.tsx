"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateResultNote } from "@/app/actions/tasks";

// Tự nhận diện link (Drive, Docs...) trong nội dung và render thành link bấm được
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noreferrer"
            className="break-all text-indigo-600 underline hover:text-indigo-800"
          >
            {p}
          </a>
        ) : (
          p
        )
      )}
    </>
  );
}

export default function ResultNote({
  taskId,
  note,
  canEdit,
}: {
  taskId: string;
  note: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const hasNote = !!note.trim();

  function save(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("task_id", taskId);
    fd.set("result_note", value.trim());
    startTransition(async () => {
      await updateResultNote(fd);
      setEditing(false);
      router.refresh();
    });
  }

  // Đã có kết quả và không ở chế độ sửa → ô hiển thị riêng
  if (hasNote && !editing) {
    return (
      <div className="mt-3">
        <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
          <Linkify text={note} />
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setValue(note);
              setEditing(true);
            }}
            className="btn-secondary mt-2 !px-2.5 !py-1 text-xs"
          >
            ✏️ Sửa kết quả
          </button>
        )}
      </div>
    );
  }

  // Chưa có kết quả và không được sửa
  if (!canEdit) {
    return (
      <p className="mt-3 text-sm text-gray-400">Chưa có nội dung kết quả.</p>
    );
  }

  // Form nhập / chỉnh sửa
  return (
    <form onSubmit={save} className="mt-3 flex flex-col gap-2">
      <textarea
        className="input"
        rows={3}
        placeholder="Mô tả kết quả đã làm, hoặc dán link Google Drive / Docs / bài đăng..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={editing}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" disabled={isPending}>
          {isPending ? "Đang lưu..." : "Lưu kết quả"}
        </button>
        {hasNote && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setEditing(false);
              setValue(note);
            }}
            disabled={isPending}
          >
            Hủy
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          File đính kèm bên dưới cũng được tính là kết quả
        </span>
      </div>
    </form>
  );
}
