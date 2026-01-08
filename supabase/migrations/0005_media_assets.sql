-- 画像アップロード資産
create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  provider provider_type,
  bucket text not null,
  path text not null,
  bytes integer,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_assets_org_created
  on media_assets(organization_id, created_at desc);

create index if not exists idx_media_assets_org_bucket
  on media_assets(organization_id, bucket);

alter table media_assets enable row level security;

create policy media_assets_read on media_assets
  for select using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = media_assets.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy media_assets_write on media_assets
  for insert with check (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = media_assets.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy media_assets_update on media_assets
  for update using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = media_assets.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy media_assets_delete on media_assets
  for delete using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = media_assets.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
