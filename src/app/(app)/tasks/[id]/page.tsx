import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { changeStatus, deleteTask, updateTask } from "@/app/actions/tasks";
import { deleteComment } from "@/app/actions/comments";
import { createLabel, setTaskLabels, toggleFollow } from "@/app/actions/labels";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import TaskCard from "@/components/TaskCard";
import AttachmentSection from "@/components/AttachmentSection";
import CommentBox from "@/components/CommentBox";
import LabelChips from "@/components/LabelChips";
import {
  LABEL_COLORS,
  PRIORITIES,
  PRIORITY_LABELS,
  fmtDate,
  isOverdue,
} from "@/lib/constants";
import { TASK_SELECT } from "@/lib/queries";
import type {
  Attachment,
  Comment,
  Label,
  Profile,
  Task,
  Team,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: taskData } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", params.id)
    .single();
  if (!taskData) notFound();
  const task = taskData as unknown as Task;

  const [
    { data: me },
    { data: commentsData },
    { data: subtasksData },
    { data: leaderRow },
    { data: teamsData },
    { data: usersData },
    { data: attachmentsData },
    { data: labelsData },
    { data: followersData },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("comments")
      .select("*, author:profiles(id,name)")
      .eq("task_id", task.id)
      .order("created_at"),
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("parent_task_id", task.id)
      .order("created_at"),
    task.team_id
      ? supabase
          .from("team_members")
          .select("is_leader")
          .eq("team_id", task.team_id)
          .eq("user_id", user!.id)
          .eq("is_leader", true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("teams").select("*").order("name"),
    supabase.from("profiles").select("*").eq("is_active", true).order("name"),
    supabase
      .from("attachments")
      .select("*, uploader:profiles(id,name)")
      .eq("task_id", task.id)
      .order("created_at"),
    supabase.from("labels").select("*").order("name"),
    supabase
      .from("task_followers")
      .select("user_id, follower:profiles(id,name)")
      .eq("task_id", task.id),
  ]);

  const profile = me as Profile;
  const comments = (commentsData || []) as unknown as Comment[];
  const subtasks = (subtasksData || []) as unknown as Task[];
  const teams = (teamsData || []) as Team[];
  const users = (usersData || []) as Profile[];
  const attachments = (attachmentsData || []) as unknown as Attachment[];
  const allLabels = (labelsData || []) as Label[];
  const followers = (followersData || []) as unknown as {
    user_id: string;
    follower: { id: string; name: string } | null;
  }[];

  const taskLabelIds = new Set(
    (task.task_labels || []).map((tl) => tl.label?.id).filter(Boolean)
  );
  const isFollowing = followers.some((f) => f.user_id === user!.id);
  const isAssignee = task.assignee_id === user!.id;
  const isAssigner = task.assigner_id === user!.id;
  const isManager = profile.role === "admin" || profile.role === "manager";
  const isLeader = !!leaderRow;
  const canApprove = isAssigner || isManager || isLeader;
  const canEdit = isAssigner || isManager || isLeader;
  const overdue = isOverdue(task);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{task.title}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <form action={toggleFollow}>
              <input type="hidden" name="task_id" value={task.id} />
              <button
                className="btn-secondary !px-2 !py-1 text-xs"
                title={isFollowing ? "Bỏ theo dõi" : "Theo dõi để nhận thông báo"}
              >
                {isFollowing ? "🔕 Bỏ theo dõi" : "🔔 Theo dõi"}
              </button>
            </form>
          </div>
        </div>
        <div className="mt-1">
          <LabelChips task={task} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 md:grid-cols-4">
          <div>
            <span className="block text-xs text-gray-400">Nhóm</span>
            {task.team?.name || "—"}
          </div>
          <div>
            <span className="block text-xs text-gray-400">Người giao</span>
            {task.assigner?.name}
          </div>
          <div>
            <span className="block text-xs text-gray-400">Người thực hiện</span>
            {task.assignee?.name}
          </div>
          <div>
            <span className="block text-xs text-gray-400">Deadline</span>
            <span className={overdue ? "font-semibold text-red-600" : ""}>
              {fmtDate(task.due_date)}
              {overdue && " (trễ hạn)"}
            </span>
          </div>
        </div>
        {followers.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            Đang theo dõi:{" "}
            {followers.map((f) => f.follower?.name).filter(Boolean).join(", ")}
          </p>
        )}
        {task.description && (
          <p className="mt-4 whitespace-pre-wrap border-t border-gray-100 pt-4 text-sm text-gray-700">
            {task.description}
          </p>
        )}

        {/* Actions theo trạng thái */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {task.status === "new" && isAssignee && (
            <form action={changeStatus}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="status" value="doing" />
              <button className="btn-primary">▶ Bắt đầu làm</button>
            </form>
          )}
          {task.status === "doing" && isAssignee && (
            <form action={changeStatus}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="status" value="review" />
              <button className="btn-primary">📤 Nộp duyệt</button>
            </form>
          )}
          {task.status === "review" && canApprove && (
            <>
              <form action={changeStatus}>
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="status" value="done" />
                <button className="btn-primary">✅ Duyệt hoàn thành</button>
              </form>
              <form action={changeStatus} className="flex items-center gap-2">
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="status" value="doing" />
                <input
                  name="note"
                  className="input !w-56"
                  placeholder="Lý do trả lại..."
                />
                <button className="btn-secondary">↩ Trả lại</button>
              </form>
            </>
          )}
          {!["done", "cancelled"].includes(task.status) &&
            (isAssigner || isManager) && (
              <form action={changeStatus}>
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="status" value="cancelled" />
                <button className="btn-secondary text-red-600">Hủy việc</button>
              </form>
            )}
          <Link href={`/tasks/new?parent=${task.id}`} className="btn-secondary">
            + Task con
          </Link>
        </div>
      </div>

      {/* Nhãn */}
      {canEdit && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">
            🏷 Nhãn / chiến dịch
          </summary>
          <form action={setTaskLabels} className="mt-3">
            <input type="hidden" name="task_id" value={task.id} />
            <div className="flex flex-wrap gap-2">
              {allLabels.map((l) => (
                <label
                  key={l.id}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    name="label_ids"
                    value={l.id}
                    defaultChecked={taskLabelIds.has(l.id)}
                  />
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.name}
                </label>
              ))}
              {allLabels.length === 0 && (
                <span className="text-sm text-gray-400">
                  Chưa có nhãn nào — tạo bên dưới.
                </span>
              )}
            </div>
            <button className="btn-primary mt-3">Lưu nhãn</button>
          </form>
          <form
            action={createLabel}
            className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3"
          >
            <input type="hidden" name="task_id" value={task.id} />
            <input
              name="name"
              className="input !w-48"
              placeholder="Tên nhãn mới..."
              required
            />
            <select name="color" className="input !w-32">
              {LABEL_COLORS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.name}
                </option>
              ))}
            </select>
            <button className="btn-secondary">+ Tạo nhãn</button>
          </form>
        </details>
      )}

      {/* Sửa việc */}
      {canEdit && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">
            ✏️ Sửa thông tin việc
          </summary>
          <form action={updateTask} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="task_id" value={task.id} />
            <div>
              <label className="label">Tiêu đề</label>
              <input
                name="title"
                className="input"
                defaultValue={task.title}
                required
              />
            </div>
            <div>
              <label className="label">Mô tả</label>
              <textarea
                name="description"
                className="input"
                rows={3}
                defaultValue={task.description || ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nhóm</label>
                <select
                  name="team_id"
                  className="input"
                  defaultValue={task.team_id || ""}
                >
                  <option value="">— Không thuộc nhóm —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Người thực hiện</label>
                <select
                  name="assignee_id"
                  className="input"
                  defaultValue={task.assignee_id}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Độ ưu tiên</label>
                <select
                  name="priority"
                  className="input"
                  defaultValue={task.priority}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Deadline</label>
                <input
                  type="datetime-local"
                  name="due_date"
                  className="input"
                  defaultValue={
                    task.due_date
                      ? new Date(task.due_date).toISOString().slice(0, 16)
                      : ""
                  }
                />
              </div>
            </div>
            <div className="flex justify-between">
              <button className="btn-primary">Lưu thay đổi</button>
            </div>
          </form>
          {(isAssigner || profile.role === "admin") && (
            <form action={deleteTask} className="mt-3 border-t border-gray-100 pt-3">
              <input type="hidden" name="task_id" value={task.id} />
              <button className="text-sm text-red-600 hover:underline">
                Xóa việc này
              </button>
            </form>
          )}
        </details>
      )}

      {/* File đính kèm */}
      <AttachmentSection
        taskId={task.id}
        userId={user!.id}
        attachments={attachments}
        isAdmin={profile.role === "admin"}
      />

      {/* Task con */}
      {subtasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">
            Task con ({subtasks.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {subtasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}

      {task.parent_task_id && (
        <Link
          href={`/tasks/${task.parent_task_id}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          ↑ Xem việc cha
        </Link>
      )}

      {/* Bình luận */}
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
                  {new Date(c.created_at).toLocaleString("vi-VN")}
                  {c.user_id === user!.id && (
                    <form action={deleteComment}>
                      <input type="hidden" name="comment_id" value={c.id} />
                      <input type="hidden" name="task_id" value={task.id} />
                      <button className="text-red-500 hover:underline">
                        Xóa
                      </button>
                    </form>
                  )}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
            </div>
          ))}
        </div>
        <CommentBox
          taskId={task.id}
          users={users
            .filter((u) => u.id !== user!.id)
            .map((u) => ({ id: u.id, name: u.name }))}
        />
      </section>
    </div>
  );
}
