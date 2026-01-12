# Supabaseマイグレーション適用手順（CLI推奨）

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

## 推奨: Supabase CLIで統一
1) CLIをインストール  
```bash
npm i -g supabase
```
2) ログイン  
```bash
supabase login
```
3) プロジェクトを初期化  
```bash
supabase init
```
4) プロジェクトをリンク  
```bash
supabase link --project-ref <プロジェクトREF>
```
5) マイグレーション適用  
```bash
supabase db push
```

## SQL Editorの手動適用について（非推奨）
- 原則使用しません。CLIで統一してください。  
- どうしても詰まる場合は `docs/runbooks/supabase-migrations-troubleshooting.md` を参照してください。  

## 適用後の確認
- `/admin/diagnostics` で **マイグレーション: 適用済み** を確認  
- `/admin/users` の警告カードが消えることを確認  
- `/admin/diagnostics` で **audit_logs インデックス: 適用済み** を確認  
- `/admin/diagnostics` で **setup_progress: 適用済み** を確認  
- `/admin/diagnostics` で **media_assets: 適用済み** を確認  
- `/admin/diagnostics` で **job_runs: 適用済み** を確認  
- `/admin/diagnostics` で **job_schedules: 適用済み** を確認  
- `/admin/diagnostics` で **job_runs 重複防止: 適用済み** を確認  

## よくある詰まり
- `SQLSTATE 42710: type already exists`  
- `migration history mismatch`  
- `relation does not exist`  
→ `docs/runbooks/supabase-migrations-troubleshooting.md` を参照してください  

## 補足
- `.env.local` の `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を確認  
- `supabase status` はローカル用（Docker必須）です。リモート運用のみなら不要です  
  - 詳細: `docs/runbooks/supabase-local-vs-remote.md`
- `supabase/config.toml` と `supabase/seed.sql` はリポジトリ管理  
- `supabase/.temp` などのローカル生成物は `.gitignore` で除外
