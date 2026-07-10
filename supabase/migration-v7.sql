-- ============================================================
-- GTask v7 — Migration (chạy SAU migration-v6.sql, trong SQL Editor)
--   1. Phân quyền động: admin bật/tắt từng quyền cho từng vai trò
--   2. Chặn deadline ở quá khứ khi tạo / sửa task
-- ============================================================

-- ---------- 1. BẢNG PHÂN QUYỀN ----------

create table if not exists public.role_permissions (
  role text not null check (role in ('admin','manager','leader','member')),
  perm text not null,
  allowed boolean not null default false,
  primary key (role, perm)
);

alter table public.role_permissions enable row level security;

create policy "role_permissions_select" on public.role_permissions
  for select to authenticated using (true);
create policy "role_permissions_write" on public.role_permissions
  for all to authenticated
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

-- Seed quyền mặc định (đúng ma trận phân quyền trong tài liệu)
insert into public.role_permissions (role, perm, allowed) values
  -- Admin: full quyền (cố định, UI không cho sửa)
  ('admin','manage_org',true),('admin','assign_any',true),('admin','assign_team',true),
  ('admin','self_task',true),('admin','edit_own_task',true),('admin','approve',true),
  ('admin','update_assigned_status',true),('admin','view_reports_all',true),
  ('admin','view_reports_team',true),('admin','view_others_tasks',true),
  -- Manager
  ('manager','manage_org',false),('manager','assign_any',true),('manager','assign_team',true),
  ('manager','self_task',true),('manager','edit_own_task',true),('manager','approve',true),
  ('manager','update_assigned_status',true),('manager','view_reports_all',true),
  ('manager','view_reports_team',true),('manager','view_others_tasks',true),
  -- Leader
  ('leader','manage_org',false),('leader','assign_any',false),('leader','assign_team',true),
  ('leader','self_task',true),('leader','edit_own_task',true),('leader','approve',true),
  ('leader','update_assigned_status',true),('leader','view_reports_all',false),
  ('leader','view_reports_team',true),('leader','view_others_tasks',true),
  -- Member
  ('member','manage_org',false),('member','assign_any',false),('member','assign_team',false),
  ('member','self_task',true),('member','edit_own_task',true),('member','approve',false),
  ('member','update_assigned_status',true),('member','view_reports_all',false),
  ('member','view_reports_team',false),('member','view_others_tasks',true)
on conflict (role, perm) do nothing;

-- ---------- HELPER: VAI TRÒ HIỆU LỰC + CHECK QUYỀN ----------

-- Vai trò hiệu lực: admin/manager theo profiles.role; còn lại leader nếu
-- đang là leader của ít nhất 1 nhóm, ngược lại member
create or replace function public.my_perm_role() returns text
language sql stable security definer set search_path = public as $$
  select case
    when (select role from profiles where id = auth.uid()) in ('admin','manager')
      then (select role from profiles where id = auth.uid())
    when exists (select 1 from team_members where user_id = auth.uid() and is_leader)
      then 'leader'
    else 'member'
  end
$$;

create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_perm_role() = 'admin'
    or coalesce(
         (select allowed from role_permissions
          where role = public.my_perm_role() and perm = p),
         false)
$$;

-- ---------- ÁP QUYỀN ĐỘNG VÀO POLICY / TRIGGER ----------

-- Giao việc: assign_any → bất kỳ ai; assign_team → trong nhóm mình (leader);
-- self_task → tự giao cho mình
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check (
    assigner_id = auth.uid()
    and (
      public.has_perm('assign_any')
      or (team_id is not null and public.is_leader_of(team_id) and public.has_perm('assign_team'))
      or (assignee_id = auth.uid() and public.has_perm('self_task'))
    )
  );

-- Xem task: view_others_tasks → xem tất cả; nếu bị tắt chỉ xem task
-- mình giao / mình nhận / mình theo dõi
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select to authenticated
  using (
    public.has_perm('view_others_tasks')
    or assignee_id = auth.uid()
    or assigner_id = auth.uid()
    or exists (
      select 1 from public.task_followers f
      where f.task_id = tasks.id and f.user_id = auth.uid()
    )
  );

-- Duyệt việc: người giao luôn được; còn lại cần quyền 'approve'
-- (manager: mọi nhóm; leader/member: nhóm mình tham gia)
create or replace function public.can_approve_task(t_assigner uuid, t_team uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'admin'
    or t_assigner = auth.uid()
    or (
      public.has_perm('approve')
      and (
        public.my_role() = 'manager'
        or (t_team is not null and exists (
              select 1 from team_members
              where team_id = t_team and user_id = auth.uid()))
      )
    )
$$;

-- Quản lý nhóm/thành viên nhóm: theo quyền manage_org (mặc định chỉ admin)
drop policy if exists "teams_write" on public.teams;
create policy "teams_write" on public.teams
  for all to authenticated
  using (public.has_perm('manage_org'))
  with check (public.has_perm('manage_org'));

drop policy if exists "team_members_write" on public.team_members;
create policy "team_members_write" on public.team_members
  for all to authenticated
  using (public.has_perm('manage_org'))
  with check (public.has_perm('manage_org'));

-- ---------- 2. CHẶN DEADLINE Ở QUÁ KHỨ ----------
-- Chỉ check khi tạo mới hoặc khi ĐỔI deadline (không chặn sửa field khác
-- trên task cũ đã trễ hạn)

create or replace function public.validate_due_date() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if (TG_OP = 'INSERT' and new.due_date is not null
      and new.due_date < now() - interval '1 minute')
     or (TG_OP = 'UPDATE' and new.due_date is distinct from old.due_date
         and new.due_date is not null
         and new.due_date < now() - interval '1 minute') then
    raise exception 'Deadline không được đặt ở quá khứ';
  end if;

  return new;
end $$;

drop trigger if exists validate_due_date on public.tasks;
create trigger validate_due_date
before insert or update on public.tasks
for each row execute procedure public.validate_due_date();
