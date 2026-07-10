-- ============================================================
-- GTask v8 — Migration (chạy SAU migration-v7.sql, trong SQL Editor)
-- Siết quyền sửa THÔNG TIN việc (tiêu đề, mô tả, nhóm, người thực hiện,
-- độ ưu tiên, deadline): CHỈ admin / manager / người giao việc.
-- Người thực hiện & leader vẫn đổi được trạng thái + kết quả công việc
-- theo luồng duyệt như cũ.
-- ============================================================

create or replace function public.protect_task_info() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Service role / SQL Editor đi qua bình thường
  if auth.uid() is null then
    return new;
  end if;

  if (new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.team_id is distinct from old.team_id
      or new.assignee_id is distinct from old.assignee_id
      or new.priority is distinct from old.priority
      or new.due_date is distinct from old.due_date
      or new.parent_task_id is distinct from old.parent_task_id)
     and not (
       public.my_role() in ('admin','manager')
       or old.assigner_id = auth.uid()
     ) then
    raise exception 'Chỉ admin, quản lý hoặc người giao việc được sửa thông tin việc';
  end if;

  return new;
end $$;

drop trigger if exists protect_task_info on public.tasks;
create trigger protect_task_info
before update on public.tasks
for each row execute procedure public.protect_task_info();
