# Supabase Storage 権限/監査ルール（画像運用）

## 目的
- 画像アップロードの安全運用とアクセス制御を標準化する
- 監査ログに残すべき情報/残してはいけない情報を明確にする

## 推奨ルール（最小）
- **private bucket** を使用し、署名URLで配布する
- 署名URLは短命（既定3600秒）で運用する
- バケット名は `SUPABASE_STORAGE_BUCKET` で一元管理する

## パス命名規約
- 形式: `org/<orgId>/loc/<locationId>/<uuid>.<ext>`
- org/loc で分離し、権限チェックで判定できる形にする

## 画像削除・保管期間の方針
- 最小方針: **不要になった画像は定期的に削除**
- 監査要件がある場合は、CSV退避や保管ポリシーを別途定義する
- まずは保持期間を決めてから削除運用を始める

## 監査ログのルール
- 記録してよい情報:
  - 操作種別（upload/publish）
  - 対象ロケーションID
  - 失敗理由（非機密のみ）
- 記録してはいけない情報:
  - 署名URL
  - トークン/鍵
  - 画像の公開URL（必要ならサムネイルの有無だけ）

## トラブルシュート
### 403が出る
- `SUPABASE_SERVICE_ROLE_KEY` の設定を確認
- 参照パスが org/loc の命名規約に合っているか確認

### 署名URLが期限切れ
- 画面を再読み込みして再発行する
- TTLが短すぎる場合は `MEDIA_SIGNED_URL_TTL_SECONDS` を調整

### service_role 未設定
- `/admin/diagnostics` で **画像アップロード: 未準備** を確認
- `.env.local` に `SUPABASE_SERVICE_ROLE_KEY` を設定
