-- 拡張
create extension if not exists "pgcrypto";

-- 列挙型
create type provider_type as enum (
  'google_gbp',
  'meta',
  'yahoo_place',
  'apple_business_connect',
  'bing_maps',
  'yahoo_yolp'
);

create type membership_role as enum ('owner', 'admin', 'member', 'viewer');
create type post_status as enum ('draft', 'queued', 'published', 'failed');
create type review_reply_status as enum ('queued', 'published', 'failed');

-- 組織
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- メンバーシップ
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role membership_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- システム管理者
create table if not exists system_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ロケーション
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  city text,
  region text,
  postal_code text,
  country text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

-- プロバイダアカウント
create table if not exists provider_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider provider_type not null,
  external_account_id text,
  display_name text,
  token_encrypted text,
  refresh_token_encrypted text,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ロケーション連携
create table if not exists location_provider_links (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  provider provider_type not null,
  external_location_id text,
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (location_id, provider)
);

-- 投稿
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  content text not null,
  media jsonb not null default '[]',
  status post_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- 投稿ターゲット
create table if not exists post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  provider provider_type not null,
  external_post_id text,
  status post_status not null default 'queued',
  error text,
  created_at timestamptz not null default now()
);

-- レビュー
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  provider provider_type not null,
  external_review_id text not null,
  location_id uuid not null references locations(id) on delete cascade,
  author text,
  rating numeric,
  comment text,
  created_at timestamptz not null default now(),
  unique (provider, external_review_id)
);

-- レビュー返信
create table if not exists review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  provider provider_type not null,
  reply_text text not null,
  external_reply_id text,
  status review_reply_status not null default 'queued',
  created_at timestamptz not null default now()
);

-- 監査ログ
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- インデックス
create index if not exists idx_memberships_org on memberships(organization_id);
create index if not exists idx_memberships_user on memberships(user_id);
create index if not exists idx_locations_org on locations(organization_id);
create index if not exists idx_provider_accounts_org on provider_accounts(organization_id);
create index if not exists idx_post_targets_post on post_targets(post_id);
create index if not exists idx_reviews_location on reviews(location_id);
create index if not exists idx_review_replies_review on review_replies(review_id);

-- 補助: システム管理者判定
create or replace function is_system_admin() returns boolean
language sql stable as $$
  select exists (
    select 1 from system_admins sa where sa.user_id = auth.uid()
  );
$$;

-- RLS
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table system_admins enable row level security;
alter table locations enable row level security;
alter table provider_accounts enable row level security;
alter table location_provider_links enable row level security;
alter table posts enable row level security;
alter table post_targets enable row level security;
alter table reviews enable row level security;
alter table review_replies enable row level security;
alter table audit_logs enable row level security;

-- ポリシー
create policy org_read on organizations
  for select using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
    )
  );

create policy org_write on organizations
  for update using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy membership_read on memberships
  for select using (
    is_system_admin() or memberships.user_id = auth.uid()
      or exists (
        select 1 from memberships m
        where m.organization_id = memberships.organization_id
          and m.user_id = auth.uid()
      )
  );

create policy membership_write on memberships
  for insert with check (is_system_admin());

create policy location_read on locations
  for select using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = locations.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy location_write on locations
  for insert with check (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = locations.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy provider_accounts_read on provider_accounts
  for select using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = provider_accounts.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy provider_accounts_write on provider_accounts
  for insert with check (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = provider_accounts.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy location_provider_links_read on location_provider_links
  for select using (
    is_system_admin() or exists (
      select 1 from locations l
      join memberships m on m.organization_id = l.organization_id
      where l.id = location_provider_links.location_id
        and m.user_id = auth.uid()
    )
  );

create policy location_provider_links_write on location_provider_links
  for insert with check (
    is_system_admin() or exists (
      select 1 from locations l
      join memberships m on m.organization_id = l.organization_id
      where l.id = location_provider_links.location_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy posts_read on posts
  for select using (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = posts.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy posts_write on posts
  for insert with check (
    is_system_admin() or exists (
      select 1 from memberships m
      where m.organization_id = posts.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy post_targets_read on post_targets
  for select using (
    is_system_admin() or exists (
      select 1 from posts p
      join memberships m on m.organization_id = p.organization_id
      where p.id = post_targets.post_id
        and m.user_id = auth.uid()
    )
  );

create policy post_targets_write on post_targets
  for insert with check (
    is_system_admin() or exists (
      select 1 from posts p
      join memberships m on m.organization_id = p.organization_id
      where p.id = post_targets.post_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy reviews_read on reviews
  for select using (
    is_system_admin() or exists (
      select 1 from locations l
      join memberships m on m.organization_id = l.organization_id
      where l.id = reviews.location_id
        and m.user_id = auth.uid()
    )
  );

create policy review_replies_read on review_replies
  for select using (
    is_system_admin() or exists (
      select 1 from reviews r
      join locations l on l.id = r.location_id
      join memberships m on m.organization_id = l.organization_id
      where r.id = review_replies.review_id
        and m.user_id = auth.uid()
    )
  );

create policy review_replies_write on review_replies
  for insert with check (
    is_system_admin() or exists (
      select 1 from reviews r
      join locations l on l.id = r.location_id
      join memberships m on m.organization_id = l.organization_id
      where r.id = review_replies.review_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy audit_logs_read on audit_logs
  for select using (is_system_admin());

create policy audit_logs_write on audit_logs
  for insert with check (is_system_admin());
