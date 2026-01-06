# Apple Business Connect

## 前提（パートナー必須）
- [ ] Apple承認のパートナー/サービスアカウントが必要
- [ ] API仕様書と認証方式は承認後に提供

## 現状の実装範囲（TEPPEN MEO側）
- [ ] プロバイダ枠のスキャフォールドのみ
- [ ] 機能はすべて無効（スタブ）
- [ ] Feature Flagで制御: `APPLE_BUSINESS_CONNECT_ENABLED=false`

## パートナー承認後に必要な追加実装（TODO）
- [ ] 認証方式（JWT/サービスアカウント）の対応
- [ ] ロケーション取得/更新APIの実装
- [ ] 投稿/レビュー機能の仕様確認と実装
- [ ] 監査ログの拡充

## 手動運用（最小版の現実解）
- [ ] Apple Business Connect管理画面で直接編集
- [ ] TEPPEN MEO側はチェックリスト/進捗管理に限定

## 有効化手順（承認後）
- [ ] `.env.local` に認証情報を追加
- [ ] `APPLE_BUSINESS_CONNECT_ENABLED=true`
- [ ] アプリ再起動
