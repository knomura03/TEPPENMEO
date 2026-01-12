# ロードマップ

# リリースまでのタスク分解（staging→prodの一本道）

## 運用タスク（人手で実施）
- [ ] Supabase staging: プロジェクト作成→CLIで `db push` → `/admin/diagnostics` で警告ゼロ
- [ ] Supabase prod: プロジェクト作成→CLIで `db push` → `/admin/diagnostics` で警告ゼロ
- [ ] Storage: staging/prod それぞれに privateバケット作成、診断で設定済み表示
- [ ] Vercel: staging/prod の環境変数入力（値は貼らない）、deploy成功
- [ ] Google: staging/prod ドメインのリダイレクトURI登録、審査状況確認
- [ ] Meta: staging/prod ドメインのリダイレクトURI登録、App Review状況確認
- [ ] CRON: `CRON_SECRET` を設定し、スケジュールが必要な環境で有効化

## Codex作業タスク（PRで対応）
- [ ] preflightコマンドでmock/realの必須項目を検査（値は出さない）
- [ ] /admin/diagnostics にリリース手順・preflight導線を追加
- [ ] Runbook: staging/prodリリース手順の一本道化
- [ ] テスト: `pnpm preflight` を含めたCI検証を準備

## 完了条件
- staging/prod のリリース手順が Runbook でクリック/入力単位まで落ちている
- preflight が不足を検知して exit 1 を返す（値は表示しない）
- `/admin/diagnostics` からリリース手順と preflight へのリンクがある
- 実機スモークテスト（Runbook準拠）で以下を満たす
  - Google: 接続→紐付け→投稿→レビュー同期→返信が成功
  - Meta: 接続→ページ紐付け→投稿（画像含む）が成功（IGは条件を満たす場合のみ）
  - Jobs: 一括同期ジョブが成功し、スケジュールON後 `pnpm jobs:tick` で履歴が増える
  - 監査ログ: フィルタ/詳細/CSVが動作し、操作が記録される
- roadmap上のチェックリストがすべて埋まる
