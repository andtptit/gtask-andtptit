import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderTeamIds, getProfile, getUser } from "@/lib/auth";
import { getMyPermRole, getMyTeamIds, getPermMap } from "@/lib/permissions";
import { changeStatus, deleteTask, updateTask } from "@/app/actions/tasks";
import { deleteComment } from "@/app/actions/comments";
import {
  addFollower,
  createLabel,
  removeFollower,
  setTaskLabels,
  toggleFollow,
} from "@/app/actions/labels";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import TaskCard from "@/components/TaskCard";
import AttachmentSection from "@/components/AttachmentSection";
import CommentBox from "@/components/CommentBox";
import LabelChips from "@/components/LabelChips";
import ResultNote from "@/components/ResultNote";
import SubmitButton from "@/components/SubmitButton";
import RichTextEditor from "@/components/RichTextEditor";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  LABEL_COLORS,
  PRIORITIES,
  PRIORITY_LABELS,
  fmtDateTime,
  isOverdue,
  toDatetimeLocal,
} from "@/lib/constants";

// Highlight "@Tên" trong bình luận
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
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const user = await getUser(); // dedupe với layout

  // Mọi query chỉ cần params.id → gộp tất cả vào 1 lượt song song duy nhất
  const [
    { data: taskData },
    me,
    leaderTeamIds,
    permRole,
    permMap,
    myTeams,
    { data: commentsData },
    { data: subtasksData },
    { data: teamsData },
    { data: usersData },
    { data: attachmentsData },
    { data: labelsData },
    { data: followersData },
  ] = await Promise.all([
    supabase.from("tasks").select(TASK_SELECT).eq("id", params.id).single(),
    getProfile(),
    getLeaderTeamIds(),
    getMyPermRole(),
    getPermMap(),
    getMyTeamIds(),
    supabase
      .from("comments")
      .select("*, author:profiles(id,name)")
      .eq("task_id", params.id)
      .order("created_at"),
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("parent_task_id", params.id)
      .order("created_at"),
    supabase.from("teams").select("*").order("name"),
    supabase.from("profiles").select("*").eq("is_active", true).order("name"),
    supabase
      .from("attachments")
      .select("*, uploader:profiles(id,name)")
      .eq("task_id", params.id)
      .order("created_at"),
    supabase.from("labels").select("*").order("name"),
    supabase
      .from("task_followers")
      .select("user_id, follower:profiles(id,name)")
      .eq("task_id", params.id),
  ]);

  if (!taskData) notFound();
  const task = taskData as unknown as Task;
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
  const isLeader = !!task.team_id && leaderTeamIds.includes(task.team_id);

  // Phân quyền động (admin cấu hình trong trang Quản trị)
  const can = (p: string) =>
    permRole === "admin" || !!permMap[permRole]?.[p];
  const inMyTeam = !!task.team_id && myTeams.includes(task.team_id);
  const canApprove =
    isAssigner ||
    (can("approve") &&
      (permRole === "admin" || permRole === "manager" || inMyTeam));
  // Sửa THÔNG TIN việc: chỉ admin/manager + người giao việc
  // (DB cũng enforce bằng trigger protect_task_info — migration-v8)
  const canEdit = (isAssigner && can("edit_own_task")) || isManager;
  void isLeader;
  const canEditResult = isAssignee || canEdit;
  const overdue = isOverdue(task);
  const hasResult =
    !!(task.result_note || "").trim() || attachments.length > 0;
  const followerIds = new Set(followers.map((f) => f.user_id));
  const addableUsers = users.filter((u) => !followerIds.has(u.id));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {searchParams.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          ⚠️ {searchParams.error}
        </p>
      )}
      {/* Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{task.title}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <form action={toggleFollow}>
              <input type="hidden" name="task_id" value={task.id} />
              <SubmitButton className="btn-secondary !px-2 !py-1 text-xs">
                {isFollowing ? "🔕 Bỏ theo dõi" : "🔔 Theo dõi"}
              </SubmitButton>
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
              {fmtDateTime(task.due_date)}
              {overdue && " (trễ hạn)"}
            </span>
          </div>
        </div>
        {/* Người theo dõi */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-400">👁 Theo dõi:</span>
          {followers.map((f) => (
            <span
              key={f.user_id}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            >
              {f.follower?.name}
              {(f.user_id === user!.id || isManager) && (
                <form action={removeFollower} className="inline">
                  <input type="hidden" name="task_id" value={task.id} />
                  <input type="hidden" name="user_id" value={f.user_id} />
                  <button
                    className="text-gray-400 hover:text-red-500"
                    title="Bỏ theo dõi"
                  >
                    ✕
                  </button>
                </form>
              )}
            </span>
          ))}
          {followers.length === 0 && (
            <span className="text-xs text-gray-400">chưa có ai</span>
          )}
          {addableUsers.length > 0 && (
            <form action={addFollower} className="flex items-center gap-1">
              <input type="hidden" name="task_id" value={task.id} />
              <select
                name="user_id"
                className="input !w-40 !px-2 !py-1 text-xs"
              >
                {addableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button className="btn-secondary !px-2 !py-1 text-xs">
                + Thêm theo dõi
              </button>
            </form>
          )}
        </div>
        {task.description && (
          <div
            className="rich-text mt-4 border-t border-gray-100 pt-4 text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.description) }}
          />
        )}

        {/* Actions theo trạng thái */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {task.status === "new" && isAssignee && (
            <form action={changeStatus}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="status" value="doing" />
              <SubmitButton>▶ Bắt đầu làm</SubmitButton>
            </form>
          )}
          {task.status === "doing" && isAssignee && (
            <div className="flex flex-col gap-1">
              <form action={changeStatus}>
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="status" value="review" />
                <SubmitButton
                  className={hasResult ? "btn-primary" : "btn-secondary"}
                >
                  📤 Nộp duyệt
                </SubmitButton>
              </form>
              {!hasResult && (
                <span className="text-xs text-amber-600">
                  ⚠️ Điền &quot;Kết quả công việc&quot; hoặc đính kèm file
                  trước khi nộp
                </span>
              )}
            </div>
          )}
          {task.status === "review" && canApprove && (
            <>
              <form action={changeStatus}>
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="status" value="done" />
                <SubmitButton>✅ Duyệt hoàn thành</SubmitButton>
              </form>
              <form action={changeStatus} className="flex items-center gap-2">
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="status" value="doing" />
                <input
                  name="note"
                  className="input !w-56"
                  placeholder="Lý do trả lại..."
                />
                <SubmitButton className="btn-secondary">↩ Trả lại</SubmitButton>
              </form>
            </>
          )}
          {!["done", "cancelled"].includes(task.status) &&
            (isAssigner || isManager) && (
              <form action={changeStatus}>
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="status" value="cancelled" />
                <SubmitButton
                  className="btn-secondary text-red-600"
                  confirmText="Hủy việc này? Task sẽ chuyển sang trạng thái Đã hủy."
                >
                  Hủy việc
                </SubmitButton>
              </form>
            )}
          <Link href={`/tasks/new?parent=${task.id}`} className="btn-secondary">
            + Task con
          </Link>
          {(isAssigner || profile.role === "admin") && (
            <form action={deleteTask} className="ml-auto">
              <input type="hidden" name="task_id" value={task.id} />
              <SubmitButton
                className="btn-secondary !border-red-200 text-red-600 hover:!bg-red-50"
                confirmText={`Xóa vĩnh viễn "${task.title}"? Bình luận, file đính kèm sẽ bị xóa theo; task con (nếu có) trở thành việc độc lập. Người liên quan sẽ nhận thông báo. Không thể hoàn tác.`}
              >
                🗑 Xóa task
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      {/* Kết quả công việc */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            📝 Kết quả công việc
          </h2>
          {hasResult ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Đã có kết quả
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Chưa có kết quả
            </span>
          )}
        </div>
        <ResultNote
          taskId={task.id}
          note={task.result_note || ""}
          canEdit={
            canEditResult && !["done", "cancelled"].includes(task.status)
          }
        />
      </section>

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
            <SubmitButton className="btn-primary mt-3">Lưu nhãn</SubmitButton>
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
            <SubmitButton className="btn-secondary">+ Tạo nhãn</SubmitButton>
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
              <RichTextEditor name="description" defaultValue={task.description || ""} />
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
                  defaultValue={toDatetimeLocal(task.due_date)}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <SubmitButton>Lưu thay đổi</SubmitButton>
            </div>
          </form>
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
                  {fmtDateTime(c.created_at)}
                  {c.user_id === user!.id && (
                    <form action={deleteComment}>
                      <input type="hidden" name="comment_id" value={c.id} />
                      <input type="hidden" name="task_id" value={task.id} />
                      <SubmitButton
                        className="text-red-500 hover:underline"
                        confirmText="Xóa bình luận này?"
                      >
                        Xóa
                      </SubmitButton>
                    </form>
                  )}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {renderWithMentions(c.content, users.map((u) => u.name))}
              </p>
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
