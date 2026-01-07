create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_action_created_at_idx
  on public.audit_logs (action, created_at desc);

create index if not exists audit_logs_org_created_at_idx
  on public.audit_logs (organization_id, created_at desc);

create index if not exists audit_logs_actor_created_at_idx
  on public.audit_logs (actor_user_id, created_at desc);

create or replace function public.audit_logs_indexes_status()
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'audit_logs_created_at_idx', to_regclass('public.audit_logs_created_at_idx') is not null,
    'audit_logs_action_created_at_idx', to_regclass('public.audit_logs_action_created_at_idx') is not null,
    'audit_logs_org_created_at_idx', to_regclass('public.audit_logs_org_created_at_idx') is not null,
    'audit_logs_actor_created_at_idx', to_regclass('public.audit_logs_actor_created_at_idx') is not null
  );
$$;
