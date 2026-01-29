# ドキュメント一覧（入口）

## 目的
- 迷子を防ぎ、最短で必要な情報にたどり着くこと
- 仕様・運用・手順書の入口を一本化すること

## 仕様
- `docs/spec/user-app.md`（ユーザー画面仕様）
- `docs/spec/admin.md`（管理画面仕様）
- `docs/spec/screens.md`（画面一覧/スクショ一覧）
- `docs/spec/acceptance.md`（受け入れ条件）

## 設計・セキュリティ
- `docs/architecture.md`
- `docs/security.md`
- `docs/global-design.md`（UI/デザイン指針）

## Runbook（運用手順）
- `docs/runbooks/` 配下を参照
- 代表:
  - `docs/runbooks/real-mode-smoke-test.md`
  - `docs/runbooks/release-master.md`
  - `docs/runbooks/release-staging.md`
  - `docs/runbooks/release-production.md`
  - `docs/runbooks/staging-cli-bootstrap.md`
  - `docs/runbooks/supabase-migrations-troubleshooting.md`
  - `docs/runbooks/inbox-real-mode-check.md`

## Provider手順
- `docs/providers/` 配下を参照
- `docs/providers/api-contracts.md`（API契約）

## UIモックのメモ
- `docs/ui/mock-ui-notes.md`
  - 動画ファイルはリポジトリにコミットしません
  - 添付が必要な場合はローカル管理とし、Runbookに記録します

## 棚卸し結果（2026-01-29）
- 参照されていないmdの削除は見送り（現時点で明確な削除対象なし）
- staging CLI手順を追加し、既存手順はリンクで集約
- 大きなファイル（mp4等）はコミット禁止（`.gitignore` で除外）
