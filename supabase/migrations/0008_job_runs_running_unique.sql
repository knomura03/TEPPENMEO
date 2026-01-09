create unique index if not exists job_runs_running_unique_idx
  on job_runs(organization_id, job_key)
  where status = 'running';

create or replace function public.job_runs_running_unique_status()
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'job_runs_running_unique_idx', to_regclass('public.job_runs_running_unique_idx') is not null
  );
$$;
