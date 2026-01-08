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

## クリック手順（/admin/jobs）
1) `/admin/jobs` を開く
2) `gbp_reviews_bulk_sync` の行を確認する
3) summary / error を確認し、失敗理由を把握する

## 失敗パターンと次アクション
- **再認可が必要**: Google再接続を実行する
- **権限不足 / API未承認**: Google Business ProfileのAPI承認とスコープ設定を確認する
- **レート制限**: 時間をおいて再実行する
- **job_runs未適用**: `0006_job_runs.sql` を適用する

## モック運用の挙動
- `PROVIDER_MOCK_MODE=true` の場合、外部APIは呼びません
- 固定結果で同期完了として扱います

## 注意
- トークン/シークレット/署名URLの完全値は共有・記録しない
