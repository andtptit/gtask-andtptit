-- ============================================================
-- GTask v3 — Migration (chạy SAU migration-v2.sql, trong SQL Editor)
-- Siết bảo mật:
--   1. Enforce luồng duyệt việc ở tầng DB (chỉ người duyệt được set done/cancelled)
--   2. Chặn đổi assigner_id (chống leo thang quyền xóa task)
--   3. Cho admin xóa file trong Storage (đồng bộ với quyền xóa attachment)
-- ============================================================

-- ---------- 1 + 2. BẢO VỆ CẬP NHẬT TASK ----------

-- Ai được duyệt task: admin/manager, người giao, leader của nhóm
create or replace function public.can_approve_task(t_assigner uuid, t_team uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin','manager')
    or t_assigner = auth.uid()
    or (t_team is not null and public.is_leader_of(t_team))
$$;

create or replace function public.protect_task_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Service role / SQL Editor (không có auth.uid()) đi qua bình thường
  if auth.uid() is null then
    return new;
  end if;

  -- (2) Chỉ admin được đổi người giao việc
  if new.assigner_id is distinct from old.assigner_id
     and public.my_role() <> 'admin' then
    raise exception 'Không được thay đổi người giao việc';
  end if;

  -- (1) Chuyển vào/ra done hoặc cancelled: chỉ người duyệt
  if new.status is distinct from old.status
     and (new.status in ('done','cancelled') or old.status in ('done','cancelled'))
     and not public.can_approve_task(old.assigner_id, old.team_id) then
    raise exception 'Chỉ người giao việc, quản lý hoặc leader nhóm được duyệt hoàn thành / hủy / mở lại việc';
  end if;

  return new;
end $$;

drop trigger if exists protect_task on public.tasks;
create trigger protect_task
before update on public.tasks
for each row execute procedure public.protect_task_update();

-- ---------- 3. STORAGE: ADMIN ĐƯỢC XÓA FILE ----------

drop policy if exists "storage_att_delete" on storage.objects;
create policy "storage_att_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (owner = auth.uid() or public.my_role() = 'admin')
  );
