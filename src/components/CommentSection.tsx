"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteComment } from "@/app/actions/comments";
import { fmtDateTime } from "@/lib/constants";
import CommentBox from "./CommentBox";
import type { Comment } from "@/lib/types";

// Highlight "@Tên" trong nội dung bình luận
function renderWithMentions(content: string, names: string[]) {
  if (names.length === 0) return content;
  const escaped = names
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = content.split(new RegExp(`@(${escaped.join("|")})`, "g"));
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-medium text-indigo-600">
        @{p}
      </span>
    ) : (
      p
    )
  );
}

// Danh sách bình luận + ô gửi, quản lý state client để gửi/xóa hiện ngay
// (optimistic) thay vì đợi round-trip server rồi router.refresh() mới thấy.
export default function CommentSection({
  taskId,
  initialComments,
  currentUserId,
  currentUserName,
  users,
}: {
  taskId: string;
  initialComments: Comment[];
  currentUserId: string;
  currentUserName: string;
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [, startTransition] = useTransition();

  // Đồng bộ khi server refresh (có id thật, đúng thứ tự)
  useEffect(() => setComments(initialComments), [initialComments]);

  function handleOptimisticSend(content: string) {
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      task_id: taskId,
      user_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      author: { id: currentUserId, name: currentUserName },
    };
    setComments((prev) => [...prev, optimistic]);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Xóa bình luận này?")) return;
    setComments((cs) => cs.filter((c) => c.id !== id));
    const fd = new FormData();
    fd.set("comment_id", id);
    fd.set("task_id", taskId);
    startTransition(async () => {
      await deleteComment(fd);
      router.refresh();
    });
  }

  return (
    <section className="card">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        Trao đổi ({comments.length})
      </h2>
      <div className="flex flex-col gap-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-semibold text-gray-700">
                {c.author?.name}
              </span>
              <span className="flex items-center gap-2">
                {fmtDateTime(c.created_at)}
                {c.user_id === currentUserId && !c.id.startsWith("tmp-") && (
                  <button
                    type="button"
                    className="text-red-500 hover:underline"
                    onClick={() => handleDelete(c.id)}
                  >
                    Xóa
                  </button>
                )}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {renderWithMentions(
                c.content,
                users.map((u) => u.name)
              )}
            </p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-gray-400">Chưa có bình luận nào.</p>
        )}
      </div>
      <CommentBox
        taskId={taskId}
        users={users.filter((u) => u.id !== currentUserId)}
        onOptimisticSend={handleOptimisticSend}
      />
    </section>
  );
}
