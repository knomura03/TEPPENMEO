-- ユーザー無効化（アプリ側ブロック）
create table if not exists user_blocks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blocked_at timestamptz not null default now(),
  blocked_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

alter table user_blocks enable row level security;

create policy user_blocks_read on user_blocks
  for select using (is_system_admin());

create policy user_blocks_insert on user_blocks
  for insert with check (is_system_admin());

create policy user_blocks_update on user_blocks
  for update using (is_system_admin());

create policy user_blocks_delete on user_blocks
  for delete using (is_system_admin());
