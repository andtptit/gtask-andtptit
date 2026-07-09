export const STATUSES = ["new", "doing", "review", "done", "cancelled"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  new: "Mới",
  doing: "Đang làm",
  review: "Chờ duyệt",
  done: "Hoàn thành",
  cancelled: "Đã hủy",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  doing: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-400 line-through",
};

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export const LABEL_COLORS = [
  { name: "Tím", value: "#6366f1" },
  { name: "Đỏ", value: "#ef4444" },
  { name: "Cam", value: "#f59e0b" },
  { name: "Xanh lá", value: "#10b981" },
  { name: "Xanh dương", value: "#0ea5e9" },
  { name: "Hồng", value: "#ec4899" },
  { name: "Xám", value: "#64748b" },
];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Trưởng phòng",
  member: "Nhân viên",
};

// App nội bộ VN — server (Vercel) chạy UTC nên phải chỉ định timezone tường minh
export const APP_TZ = "Asia/Ho_Chi_Minh";
export const APP_TZ_OFFSET = "+07:00";

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: APP_TZ,
  });
}

export function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TZ,
  });
}

// timestamptz (UTC) → giá trị cho <input type="datetime-local"> theo giờ VN
export function toDatetimeLocal(d: string | null | undefined) {
  if (!d) return "";
  // sv-SE cho định dạng "YYYY-MM-DD HH:mm:ss"
  return new Date(d)
    .toLocaleString("sv-SE", { timeZone: APP_TZ })
    .slice(0, 16)
    .replace(" ", "T");
}

// Giá trị datetime-local ("2026-07-09T15:00", giờ VN) → ISO UTC để lưu timestamptz
export function dueDateToUtc(v: string | null | undefined) {
  if (!v) return null;
  const withSec = v.length === 16 ? `${v}:00` : v;
  const date = new Date(`${withSec}${APP_TZ_OFFSET}`);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

export function isOverdue(task: { due_date: string | null; status: string }) {
  return (
    !!task.due_date &&
    !["done", "cancelled"].includes(task.status) &&
    new Date(task.due_date) < new Date()
  );
}
