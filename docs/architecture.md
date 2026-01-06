# アーキテクチャ

## 目的
- マルチテナント分離（organizations + memberships）
- プロバイダIFと機能フラグによる拡張性
- Supabase + Vercel で低コスト運用

## 全体像
- **Next.js App Router**: 画面 + サーバー処理
- **Supabase**: Auth + Postgres
- **Provider framework**: 外部APIを共通IFで管理
- **Services層**: ドメイン処理（投稿/レビュー/ロケーション）

## 主要モジュール
- `src/server/auth`: セッション取得とRBAC
- `src/server/db`: Supabaseクライアント
- `src/server/providers`: プロバイダIF + 実装
- `src/server/services`: ドメイン処理と連携
- `src/server/utils`: 暗号化/ログ/HTTP/フラグ

## データフロー（最小版）
1. Supabase Authでログイン
2. OAuthでプロバイダ連携
3. トークンをAES-GCMで暗号化保存
4. 手動同期でロケーション/レビュー取得

## Provider設計
各プロバイダが同じIFを実装:
- `getAuthUrl`, `handleOAuthCallback`
- `listLocations`, `listReviews`, `replyReview`
- `createPost`, `searchPlaces`

## ジョブ実行（最小版）
- 最小版は「今すぐ同期」ボタンを想定
- 将来はキュー/cronを追加

## デプロイ
- **Vercel**: Next.jsホスティング
- **Supabase**: DB + Auth
- すべての機密情報は環境変数で管理
