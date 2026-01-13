# 画面一覧（最小版）

## 画面一覧
| 画面 | URL | 権限 | 目的 | 主な操作 | スクショ名（Playwright） |
| --- | --- | --- | --- | --- | --- |
| サインイン | `/auth/sign-in` | 全員 | ログイン | サインイン | - |
| サインアップ | `/auth/sign-up` | 全員 | 新規登録 | アカウント作成 | - |
| ダッシュボード | `/app` | テナント | 状態把握 | 主要導線の確認 | - |
| セットアップ | `/app/setup` | テナント | 初期導線 | 進捗/KPI/完了チェック、接続/紐付け/投稿テストのリンク集、自動同期設定 | - |
| レビュー受信箱 | `/app/reviews` | テナント | レビュー対応 | 横断一覧/フィルタ/検索/返信（Googleのみ） | app-reviews-table / app-reviews-table-details |
| ロケーション一覧 | `/app/locations` | テナント | ロケーション管理 | 作成/一覧/検索 | app-locations-ui-primitives |
| ロケーション詳細 | `/app/locations/[id]` | テナント | 連携/レビュー/投稿 | 接続/切断/紐付け/投稿（Meta/Google）/画像アップロード/投稿履歴（検索/フィルタ/ページング/再実行） | app-location-detail-ui-primitives |
| 管理概要 | `/admin` | システム管理 | 全体状況 | 概要表示 | admin-overview-design |
| 管理プロバイダ | `/admin/providers` | システム管理 | 連携状態 | フラグ確認 | - |
| 監査ログ | `/admin/audit-logs` | システム管理 | 操作履歴 | 期間/actor/action/組織/provider_type/自由検索/CSV出力 | admin-audit-logs-design / admin-audit-logs-table / admin-audit-logs-table-details |
| ジョブ履歴 | `/admin/jobs` | システム管理 | ジョブ確認 | 一括同期などの履歴確認 | admin-jobs-design / admin-jobs-table / admin-jobs-table-details |
| 診断 | `/admin/diagnostics` | システム管理 | 環境/接続確認 | 設定チェック | admin-diagnostics-design |
| リリース準備 | `/admin/release` | システム管理 | リリース前チェック | 環境/マイグレーション/権限/Runbook導線 | admin-release-dashboard |
| 実機ヘルスチェック | `/admin/provider-health` | システム管理 | 実API検証 | 読み取りAPIで接続/権限を確認 | admin-provider-health-design |
| ユーザー管理 | `/admin/users` | システム管理 | ユーザー管理 | 招待/テンプレ/無効化理由/削除/検索/フィルタ | admin-users-design / admin-users-table / admin-users-table-details |
| 組織一覧 | `/admin/organizations` | システム管理 | 組織管理 | 一覧/遷移 | - |
| 組織メンバー管理 | `/admin/organizations/[id]` | システム管理 | メンバー管理 | 追加/変更/削除 | - |
| 公開トップ | `/` | 公開 | 概要/ログイン導線 | 公開情報確認 | public-home |
| プライバシーポリシー | `/privacy` | 公開 | プライバシー表示 | 公開確認 | public-privacy |
| 利用規約 | `/terms` | 公開 | 規約表示 | 公開確認 | public-terms |
| データ削除 | `/data-deletion` | 公開 | 削除手順案内 | 公開確認 | public-data-deletion |

## 画面遷移の基本
- 未ログイン時は `/auth/sign-in` へ誘導
- 管理画面は system_admin のみ表示
