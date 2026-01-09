# Supabaseマイグレーション適用手順

## 目的
- DBマイグレーションの未適用を防ぎ、管理機能が止まらないようにする
- 特に `user_blocks`（ユーザー無効化/理由管理）を確実に適用する

## 対象マイグレーション（最小）
- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_user_blocks.sql`
- `supabase/migrations/0003_audit_logs_indexes.sql`
- `supabase/migrations/0004_setup_progress.sql`
- `supabase/migrations/0005_media_assets.sql`
- `supabase/migrations/0006_job_runs.sql`
- `supabase/migrations/0007_job_schedules.sql`
- `supabase/migrations/0008_job_runs_running_unique.sql`

## 適用方法A: SQL Editor（推奨）
1) Supabaseダッシュボードを開く  
2) **SQL Editor** → **New query**  
3) `supabase/migrations/0001_init.sql` を全文貼り付け  
4) **Run** を実行  
5) 続けて `supabase/migrations/0002_user_blocks.sql` を貼り付け  
6) **Run** を実行  
7) 続けて `supabase/migrations/0003_audit_logs_indexes.sql` を貼り付け  
8) **Run** を実行  
9) 続けて `supabase/migrations/0004_setup_progress.sql` を貼り付け  
10) **Run** を実行  
11) 続けて `supabase/migrations/0005_media_assets.sql` を貼り付け  
12) **Run** を実行  
13) 続けて `supabase/migrations/0006_job_runs.sql` を貼り付け  
14) **Run** を実行  
15) 続けて `supabase/migrations/0007_job_schedules.sql` を貼り付け  
16) **Run** を実行  
17) 続けて `supabase/migrations/0008_job_runs_running_unique.sql` を貼り付け  
18) **Run** を実行  

## 適用方法B: Supabase CLI（任意）
1) CLIをインストール  
```bash
npm i -g supabase
supabase login
```
2) プロジェクトをリンク  
```bash
supabase init
supabase link --project-ref <プロジェクトREF>
```
3) マイグレーション適用  
```bash
supabase db push
```

## 適用後の確認
- `/admin/diagnostics` で **マイグレーション: 適用済み** を確認  
- `/admin/users` の警告カードが消えることを確認  
- `/admin/diagnostics` で **audit_logs インデックス: 適用済み** を確認  
- `/admin/diagnostics` で **setup_progress: 適用済み** を確認  
- `/admin/diagnostics` で **media_assets: 適用済み** を確認  
- `/admin/diagnostics` で **job_runs: 適用済み** を確認  
- `/admin/diagnostics` で **job_schedules: 適用済み** を確認  
- `/admin/diagnostics` で **job_runs 重複防止: 適用済み** を確認  

## よくある失敗
### `relation "user_blocks" does not exist`
- `0002_user_blocks.sql` が未適用  
- SQL Editorで `0002_user_blocks.sql` を再実行する  

### `column "reason" does not exist`
- `user_blocks` はあるがカラム不足  
- `0002_user_blocks.sql` を再適用する  

### `監査ログのインデックス判定関数が見つかりません`
- `0003_audit_logs_indexes.sql` が未適用  
- SQL Editorで `0003_audit_logs_indexes.sql` を実行する  

### `setup_progress テーブルが見つかりません`
- `0004_setup_progress.sql` が未適用  
- SQL Editorで `0004_setup_progress.sql` を実行する  

### `media_assets テーブルが見つかりません`
- `0005_media_assets.sql` が未適用  
- SQL Editorで `0005_media_assets.sql` を実行する  

### `job_runs テーブルが見つかりません`
- `0006_job_runs.sql` が未適用  
- SQL Editorで `0006_job_runs.sql` を実行する  

### `job_schedules テーブルが見つかりません`
- `0007_job_schedules.sql` が未適用  
- SQL Editorで `0007_job_schedules.sql` を実行する  

### `job_runs の重複防止インデックスが未適用`
- `0008_job_runs_running_unique.sql` が未適用  
- SQL Editorで `0008_job_runs_running_unique.sql` を実行する  

### Supabaseキー未設定
- `.env.local` の `SUPABASE_SERVICE_ROLE_KEY` を確認する  
- `NEXT_PUBLIC_SUPABASE_URL` も合わせて確認する  
