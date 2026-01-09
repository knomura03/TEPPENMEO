-- ジョブスケジュール
create table if not exists job_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  job_key text not null,
  enabled boolean not null default false,
  cadence_minutes integer not null default 1440,
  next_run_at timestamptz,
  last_enqueued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, job_key)
);

create index if not exists idx_job_schedules_org
  on job_schedules(organization_id);

create index if not exists idx_job_schedules_next_run
  on job_schedules(next_run_at);

alter table job_schedules enable row level security;

create policy job_schedules_read on job_schedules
  for select using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = job_schedules.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy job_schedules_write on job_schedules
  for insert with check (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = job_schedules.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy job_schedules_update on job_schedules
  for update using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = job_schedules.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy job_schedules_delete on job_schedules
  for delete using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = job_schedules.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
