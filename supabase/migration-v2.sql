-- ============================================================
-- GTask v2 — Migration (chạy SAU schema.sql, trong SQL Editor)
-- Thêm: file đính kèm, nhãn, người theo dõi, storage, realtime
-- ============================================================

-- ---------- FILE ĐÍNH KÈM ----------

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  size bigint default 0,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index attachments_task_idx on public.attachments(task_id);

alter table public.attachments enable row level security;
create policy "attachments_select" on public.attachments
  for select to authenticated using (true);
create policy "attachments_insert" on public.attachments
  for insert to authenticated with check (uploaded_by = auth.uid());
create policy "attachments_delete" on public.attachments
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.my_role() = 'admin');

-- Storage bucket (public read để lấy link trực tiếp — công cụ nội bộ)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "storage_att_read" on storage.objects
  for select to public using (bucket_id = 'attachments');
create policy "storage_att_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');
create policy "storage_att_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid());

-- ---------- NHÃN (LABELS) ----------

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (task_id, label_id)
);

alter table public.labels enable row level security;
alter table public.task_labels enable row level security;

create policy "labels_select" on public.labels
  for select to authenticated using (true);
create policy "labels_insert" on public.labels
  for insert to authenticated with check (true);
create policy "labels_write" on public.labels
  for update to authenticated using (public.my_role() in ('admin','manager'));
create policy "labels_delete" on public.labels
  for delete to authenticated using (public.my_role() in ('admin','manager'));

create policy "task_labels_select" on public.task_labels
  for select to authenticated using (true);
create policy "task_labels_insert" on public.task_labels
  for insert to authenticated with check (true);
create policy "task_labels_delete" on public.task_labels
  for delete to authenticated using (true);

-- ---------- NGƯỜI THEO DÕI (FOLLOWERS) ----------

create table public.task_followers (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

alter table public.task_followers enable row level security;
create policy "followers_select" on public.task_followers
  for select to authenticated using (true);
create policy "followers_insert" on public.task_followers
  for insert to authenticated with check (user_id = auth.uid());
create policy "followers_delete" on public.task_followers
  for delete to authenticated using (user_id = auth.uid());

-- ---------- REALTIME ----------
-- Bật realtime cho bảng tasks (kanban tự cập nhật)

alter publication supabase_realtime add table public.tasks;
