-- ============================================================
-- GTask v4 — Index tăng tốc truy vấn (chạy SAU migration-v3.sql)
-- ============================================================

-- Trang chi tiết task: tìm task con
create index if not exists tasks_parent_idx
  on public.tasks(parent_task_id) where parent_task_id is not null;

-- Lịch: lọc theo khoảng due_date (không kèm team)
create index if not exists tasks_due_idx on public.tasks(due_date);

-- Chuông thông báo: 10 thông báo mới nhất của user
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
