-- セットアップ進捗
create table if not exists setup_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  step_key text not null,
  is_done boolean not null default false,
  done_at timestamptz,
  done_by_user_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, step_key)
);

create index if not exists idx_setup_progress_org on setup_progress(organization_id);

alter table setup_progress enable row level security;

create policy setup_progress_read on setup_progress
  for select using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = setup_progress.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy setup_progress_write on setup_progress
  for insert with check (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = setup_progress.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy setup_progress_update on setup_progress
  for update using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = setup_progress.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy setup_progress_delete on setup_progress
  for delete using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = setup_progress.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
