-- ============================================================
-- GTask v6 — Migration (chạy SAU migration-v5.sql, trong SQL Editor)
--   1. Cột "Kết quả công việc" (result_note) trên tasks
--   2. Chặn Nộp duyệt khi chưa có kết quả (note hoặc file đính kèm)
--   3. Cho phép thêm NGƯỜI KHÁC vào theo dõi task (kể cả khác nhóm)
-- ============================================================

-- ---------- 1. KẾT QUẢ CÔNG VIỆC ----------

alter table public.tasks
  add column if not exists result_note text not null default '';

-- ---------- 2. ENFORCE Ở TẦNG DB: NỘP DUYỆT PHẢI CÓ KẾT QUẢ ----------
-- (App cũng check trước để báo lỗi thân thiện; trigger là lớp chặn cuối)

create or replace function public.require_result_before_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Service role / SQL Editor đi qua bình thường
  if auth.uid() is null then
    return new;
  end if;

  if new.status = 'review'
     and old.status is distinct from 'review'
     and coalesce(trim(new.result_note), '') = ''
     and not exists (select 1 from public.attachments where task_id = new.id) then
    raise exception 'Cần điền Kết quả công việc hoặc đính kèm file trước khi nộp duyệt';
  end if;

  return new;
end $$;

drop trigger if exists require_result_review on public.tasks;
create trigger require_result_review
before update on public.tasks
for each row execute procedure public.require_result_before_review();

-- ---------- 3. THÊM NGƯỜI KHÁC VÀO THEO DÕI ----------
-- Trước: chỉ tự thêm mình. Nay: ai đăng nhập cũng thêm được người khác
-- (theo dõi chỉ để nhận thông báo + hiện tên; xem task vốn mở cho cả phòng).
-- Xóa follower: chính mình, admin/manager.

drop policy if exists "followers_insert" on public.task_followers;
create policy "followers_insert" on public.task_followers
  for insert to authenticated with check (true);

drop policy if exists "followers_delete" on public.task_followers;
create policy "followers_delete" on public.task_followers
  for delete to authenticated
  using (user_id = auth.uid() or public.my_role() in ('admin','manager'));
