# Supabaseマイグレーション詰まり対応（トラブルシューティング）

## 1) 推奨ワークフロー（結論）
- **CLIで統一**して適用します（SQL Editor手動は原則使いません）
- どうしても詰まった場合のみ、このRunbookの手順で復旧します

## 2) 初回セットアップ（CLI推奨）
1. CLIをインストール  
```bash
npm i -g supabase
```
2. ログイン  
```bash
supabase login
```
3. プロジェクト初期化  
```bash
supabase init
```
4. プロジェクトをリンク  
```bash
supabase link --project-ref <プロジェクトREF>
```
5. マイグレーション適用  
```bash
supabase db push
```
6. 確認  
- `/admin/diagnostics` の警告が消えること  
- `supabase migration list --linked` で `applied` が揃うこと

## 3) よくあるエラーと対処

### (A) SQLSTATE 42710: type already exists
**原因**  
- 手動SQLの部分適用、重複適用、履歴不整合が原因になりやすい

**対処1（推奨・最短復旧）**  
- データは消えます（リセット前提）  
```bash
supabase db reset --linked
```

**対処2（データを残したい場合）**  
- **スキーマがすでに最新**であることが前提  
- migration履歴だけ整える  
```bash
supabase migration list --linked
supabase migration repair <version> --status applied --linked
```

**確認**  
- `/admin/diagnostics` のマイグレーション警告が消える  
- `supabase migration list --linked` で整合が取れている

### (B) migration history mismatch
**原因**  
- Dashboardで手動SQLを実行した  
- ローカルのmigrationsとDBの履歴がズレた

**対処1（推奨・最短復旧）**  
```bash
supabase db reset --linked
```

**対処2（データを残したい場合）**  
```bash
supabase migration list --linked
supabase migration repair <version> --status applied --linked
```

**注意**  
- repairは**スキーマが揃っている場合のみ**使う  
- 使い方を誤ると未適用が見えなくなる

## 4) やってはいけないこと
- SQL EditorとCLIを混在させる  
- マイグレーションの一部だけを手動で適用する  
- ログインURL、検証コード、session_id等を共有・記載する

## 5) 最後の確認
- `/admin/diagnostics` のマイグレーション警告が消える  
- `supabase migration list --linked` で `applied` が揃う  
- 不明な場合は `docs/runbooks/supabase-migrations.md` も併読する
