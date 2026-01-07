# Supabaseマイグレーション適用手順

## 目的
- DBマイグレーションの未適用を防ぎ、管理機能が止まらないようにする
- 特に `user_blocks`（ユーザー無効化/理由管理）を確実に適用する

## 対象マイグレーション（最小）
- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_user_blocks.sql`

## 適用方法A: SQL Editor（推奨）
1) Supabaseダッシュボードを開く  
2) **SQL Editor** → **New query**  
3) `supabase/migrations/0001_init.sql` を全文貼り付け  
4) **Run** を実行  
5) 続けて `supabase/migrations/0002_user_blocks.sql` を貼り付け  
6) **Run** を実行  

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

## よくある失敗
### `relation "user_blocks" does not exist`
- `0002_user_blocks.sql` が未適用  
- SQL Editorで `0002_user_blocks.sql` を再実行する  

### `column "reason" does not exist`
- `user_blocks` はあるがカラム不足  
- `0002_user_blocks.sql` を再適用する  

### Supabaseキー未設定
- `.env.local` の `SUPABASE_SERVICE_ROLE_KEY` を確認する  
- `NEXT_PUBLIC_SUPABASE_URL` も合わせて確認する  
