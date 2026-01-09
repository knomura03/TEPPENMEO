# Googleレビュー一括同期（GBP）手順

## 目的
- GBP紐付け済みロケーションのレビュー同期をまとめて実行し、手動作業を減らす

## 前提
- Google接続済み
- GBPロケーション紐付け済み
- owner / admin 権限でログイン
- `SUPABASE_SERVICE_ROLE_KEY` が設定済み

## クリック手順（/app/setup）
1) `/app/setup` を開く
2) 「Googleレビューを一括同期」カードの **一括同期を実行** を押す
3) 結果（対象数/成功/失敗/レビュー件数）を確認する
4) 失敗がある場合は、カード内の案内に従って再認可や権限確認を行う

## 自動同期（スケジューリング）
### 前提
- `0007_job_schedules.sql` と `0008_job_runs_running_unique.sql` を適用済み
- `CRON_SECRET` を設定済み

### /app/setup での設定（クリック順）
1) `/app/setup` を開く
2) 「自動同期」を **有効にする**
3) 頻度を選ぶ（6時間 / 24時間）
4) **設定を保存** を押す
5) 「次回予定」を確認する

### ローカルでの確認（HTTPなし）
1) `.env.local` に `CRON_SECRET` とSupabase設定を用意する  
2) `pnpm jobs:tick` を実行する  
3) `/admin/jobs` で履歴が増えることを確認する  

### Vercel Cron（推奨）での設定（クリック順）
1) Vercelの対象プロジェクトを開く
2) **Settings** → **Cron Jobs** → **Add Cron Job**
3) URLに `https://<YOUR_DOMAIN>/api/cron/tick?secret=<CRON_SECRET>` を設定
4) スケジュールに `0 */6 * * *`（6時間）または `0 0 * * *`（24時間）を設定
5) 保存して、`/admin/jobs` で履歴が増えることを確認

### GitHub Actions schedule（代替）
1) GitHubのリポジトリを開く
2) **Add file** → **Create new file** を選ぶ  
3) `.github/workflows/cron.yml` を作成し、以下を貼り付ける  
```yaml
name: cron-bulk-review-sync
on:
  schedule:
    - cron: "0 */6 * * *"
jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - name: Call cron endpoint
        run: curl -fsSL "https://<YOUR_DOMAIN>/api/cron/tick?secret=<CRON_SECRET>"
```
4) **Commit new file** で保存する  
5) Actionsの実行履歴と `/admin/jobs` を確認する

## クリック手順（/admin/jobs）
1) `/admin/jobs` を開く
2) `gbp_reviews_bulk_sync` の行を確認する
3) summary / error を確認し、失敗理由を把握する

## 失敗パターンと次アクション
- **再認可が必要**: Google再接続を実行する
- **権限不足 / API未承認**: Google Business ProfileのAPI承認とスコープ設定を確認する
- **レート制限**: 時間をおいて再実行する
- **job_runs未適用**: `0006_job_runs.sql` を適用する
- **job_schedules未適用**: `0007_job_schedules.sql` を適用する
- **重複防止未適用**: `0008_job_runs_running_unique.sql` を適用する
- **CRON_SECRET未設定**: `.env.local` に `CRON_SECRET` を設定する

## モック運用の挙動
- `PROVIDER_MOCK_MODE=true` の場合、外部APIは呼びません
- 固定結果で同期完了として扱います

## 注意
- トークン/シークレット/署名URLの完全値は共有・記録しない
