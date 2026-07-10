-- ============================================================
-- GTask v9 — Đảm bảo realtime được bật cho tasks + notifications
-- (idempotent: chạy nhiều lần không lỗi; dùng khi nghi ngờ
--  migration-v2/v5 chưa được chạy hoặc chạy thiếu)
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;

-- Kiểm tra kết quả: 2 dòng dưới phải hiện 'notifications' và 'tasks'
select tablename from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
