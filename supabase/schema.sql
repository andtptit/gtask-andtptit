-- ============================================================
-- GTask v1 — Schema Supabase (chạy trong SQL Editor)
-- ============================================================

-- ---------- BẢNG ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  title text default '',
  role text not null default 'member' check (role in ('admin','manager','member')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_leader boolean not null default false,
  primary key (team_id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  team_id uuid references public.teams(id),
  assigner_id uuid not null references public.profiles(id),
  assignee_id uuid not null references public.profiles(id),
  parent_task_id uuid references public.tasks(id) on delete set null,
  status text not null default 'new' check (status in ('new','doing','review','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  start_date date,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_assignee_status_idx on public.tasks(assignee_id, status);
create index tasks_team_due_idx on public.tasks(team_id, due_date);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);
create index comments_task_idx on public.comments(task_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  type text not null default 'info',
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, is_read);

-- ---------- TRIGGERS ----------

-- Tự tạo profile khi user đăng ký
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Cập nhật updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger tasks_updated_at
before update on public.tasks
for each row execute procedure public.set_updated_at();

-- ---------- HELPER FUNCTIONS (dùng trong RLS) ----------

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_leader_of(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = t and user_id = auth.uid() and is_leader
  )
$$;

-- Chặn member tự đổi role / is_active của mình
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and public.my_role() <> 'admin' then
    raise exception 'Chỉ admin được thay đổi vai trò/trạng thái tài khoản';
  end if;
  return new;
end $$;

create trigger protect_profile
before update on public.profiles
for each row execute procedure public.protect_profile_fields();

-- ---------- ROW LEVEL SECURITY ----------

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

-- profiles: ai đăng nhập cũng xem được; sửa: chính mình hoặc admin
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.my_role() = 'admin');

-- teams: xem tất cả; quản lý: admin/manager
create policy "teams_select" on public.teams
  for select to authenticated using (true);
create policy "teams_write" on public.teams
  for all to authenticated
  using (public.my_role() in ('admin','manager'))
  with check (public.my_role() in ('admin','manager'));

-- team_members: xem tất cả; quản lý: admin/manager
create policy "team_members_select" on public.team_members
  for select to authenticated using (true);
create policy "team_members_write" on public.team_members
  for all to authenticated
  using (public.my_role() in ('admin','manager'))
  with check (public.my_role() in ('admin','manager'));

-- tasks
create policy "tasks_select" on public.tasks
  for select to authenticated using (true);

-- Tạo task: admin/manager giao cho bất kỳ ai; leader giao trong nhóm mình; ai cũng tự giao cho mình
create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check (
    assigner_id = auth.uid()
    and (
      public.my_role() in ('admin','manager')
      or (team_id is not null and public.is_leader_of(team_id))
      or assignee_id = auth.uid()
    )
  );

-- Cập nhật: admin/manager, người giao, người nhận, leader của nhóm
create policy "tasks_update" on public.tasks
  for update to authenticated
  using (
    public.my_role() in ('admin','manager')
    or assigner_id = auth.uid()
    or assignee_id = auth.uid()
    or (team_id is not null and public.is_leader_of(team_id))
  );

-- Xóa: người giao hoặc admin
create policy "tasks_delete" on public.tasks
  for delete to authenticated
  using (assigner_id = auth.uid() or public.my_role() = 'admin');

-- comments
create policy "comments_select" on public.comments
  for select to authenticated using (true);
create policy "comments_insert" on public.comments
  for insert to authenticated with check (user_id = auth.uid());
create policy "comments_update" on public.comments
  for update to authenticated using (user_id = auth.uid());
create policy "comments_delete" on public.comments
  for delete to authenticated using (user_id = auth.uid());

-- notifications: chỉ xem/sửa của mình; ai đăng nhập cũng tạo được (để notify người khác)
create policy "notifications_select" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_update" on public.notifications
  for update to authenticated using (user_id = auth.uid());
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (true);

-- ---------- SEED ----------

insert into public.teams (name, description) values
  ('Thương hiệu', 'Nhóm Thương hiệu — bài viết, kịch bản, SEO'),
  ('Media', 'Nhóm Media — thiết kế, video, hình ảnh'),
  ('CRM', 'Nhóm CRM — chăm sóc khách hàng, data');

-- ---------- SAU KHI ĐĂNG KÝ TÀI KHOẢN ĐẦU TIÊN ----------
-- Chạy lệnh sau để cấp quyền admin (thay email của bạn):
-- update public.profiles set role = 'admin' where email = 'andtptit@gmail.com';
