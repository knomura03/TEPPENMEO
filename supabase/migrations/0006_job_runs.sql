-- ジョブ実行履歴
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_run_status') THEN
    CREATE TYPE job_run_status AS ENUM ('running', 'succeeded', 'failed', 'partial');
  END IF;
END $$;

create table if not exists job_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  job_key text not null,
  status job_run_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary_json jsonb not null default '{}',
  error_json jsonb not null default '{}',
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists job_run_items (
  id uuid primary key default gen_random_uuid(),
  job_run_id uuid not null references job_runs(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  status job_run_status not null,
  count integer,
  error_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_job_runs_org_started
  on job_runs(organization_id, started_at desc);

create index if not exists idx_job_runs_job_key
  on job_runs(job_key);

create index if not exists idx_job_run_items_run
  on job_run_items(job_run_id);

alter table job_runs enable row level security;
alter table job_run_items enable row level security;

create policy job_runs_read on job_runs
  for select using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = job_runs.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy job_runs_write on job_runs
  for insert with check (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = job_runs.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy job_runs_update on job_runs
  for update using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = job_runs.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy job_runs_delete on job_runs
  for delete using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = job_runs.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy job_run_items_read on job_run_items
  for select using (
    is_system_admin() or exists (
      select 1 from job_runs jr
      join memberships m on m.organization_id = jr.organization_id
      where jr.id = job_run_items.job_run_id
        and m.user_id = auth.uid()
    )
  );

create policy job_run_items_write on job_run_items
  for insert with check (
    is_system_admin() or exists (
      select 1 from job_runs jr
      join memberships m on m.organization_id = jr.organization_id
      where jr.id = job_run_items.job_run_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy job_run_items_update on job_run_items
  for update using (
    is_system_admin() or exists (
      select 1 from job_runs jr
      join memberships m on m.organization_id = jr.organization_id
      where jr.id = job_run_items.job_run_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy job_run_items_delete on job_run_items
  for delete using (
    is_system_admin() or exists (
      select 1 from job_runs jr
      join memberships m on m.organization_id = jr.organization_id
      where jr.id = job_run_items.job_run_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
