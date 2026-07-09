"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Attachment } from "@/lib/types";

function fmtSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentSection({
  taskId,
  userId,
  attachments,
  isAdmin,
}: {
  taskId: string;
  userId: string;
  attachments: Attachment[];
  isAdmin: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function publicUrl(path: string) {
    return supabase.storage.from("attachments").getPublicUrl(path).data
      .publicUrl;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("File tối đa 20MB.");
      return;
    }
    setBusy(true);
    setError("");

    const safeName = file.name.replace(/[^a-zA-Z0-9_.\-]/g, "_");
    const path = `${taskId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("attachments")
      .upload(path, file);

    if (upErr) {
      setError(`Upload lỗi: ${upErr.message}`);
    } else {
      const { error: dbErr } = await supabase.from("attachments").insert({
        task_id: taskId,
        file_name: file.name,
        file_path: path,
        size: file.size,
        uploaded_by: userId,
      });
      if (dbErr) {
        // Ghi DB thất bại → dọn file vừa upload, tránh file mồ côi trong Storage
        await supabase.storage.from("attachments").remove([path]);
        setError(`Không lưu được file: ${dbErr.message}`);
      }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function handleDelete(att: Attachment) {
    if (!confirm(`Xóa file "${att.file_name}"?`)) return;
    setBusy(true);
    setError("");

    // Xóa row DB trước (RLS quyết định quyền), thành công mới xóa file Storage
    const { error: dbErr } = await supabase
      .from("attachments")
      .delete()
      .eq("id", att.id);
    if (dbErr) {
      setError(`Không xóa được: ${dbErr.message}`);
    } else {
      const { error: stErr } = await supabase.storage
        .from("attachments")
        .remove([att.file_path]);
      if (stErr) setError(`Đã xóa bản ghi nhưng file chưa xóa được: ${stErr.message}`);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          📎 File đính kèm ({attachments.length})
        </h2>
        <label className={`btn-secondary cursor-pointer ${busy ? "opacity-50" : ""}`}>
          {busy ? "Đang tải..." : "+ Tải file lên"}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={busy}
          />
        </label>
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-2">
        {attachments.length === 0 && (
          <p className="text-sm text-gray-400">Chưa có file nào.</p>
        )}
        {attachments.map((att) => (
          <div
            key={att.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
          >
            <a
              href={publicUrl(att.file_path)}
              target="_blank"
              rel="noreferrer"
              className="truncate font-medium text-indigo-600 hover:underline"
            >
              {att.file_name}
            </a>
            <span className="ml-2 flex shrink-0 items-center gap-3 text-xs text-gray-500">
              {fmtSize(att.size)}
              <span>{att.uploader?.name}</span>
              {(att.uploaded_by === userId || isAdmin) && (
                <button
                  onClick={() => handleDelete(att)}
                  className="text-red-500 hover:underline"
                  disabled={busy}
                >
                  Xóa
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
