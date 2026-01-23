-- 投稿テンプレート
create table if not exists post_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  body text not null,
  default_targets jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists idx_post_templates_org on post_templates(organization_id);
create index if not exists idx_post_templates_org_active on post_templates(organization_id)
  where archived_at is null;

alter table post_templates enable row level security;

create policy post_templates_read on post_templates
  for select using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = post_templates.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy post_templates_write on post_templates
  for insert with check (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = post_templates.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy post_templates_update on post_templates
  for update using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = post_templates.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy post_templates_delete on post_templates
  for delete using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = post_templates.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
