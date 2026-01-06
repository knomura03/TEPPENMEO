# セキュリティ

## トークン暗号化（TOKEN_ENCRYPTION_KEY）

### 推奨生成手順
- Base64（推奨）
```bash
openssl rand -base64 32
```
- Hex（64桁）
```bash
openssl rand -hex 32
```

### 形式と取り扱い
- `TOKEN_ENCRYPTION_KEY` は **32バイト** 必須
- コードは以下の順に解釈:
  1. 64桁のhex文字列
  2. base64文字列
  3. 上記以外はUTF-8生文字列
- どの形式でも最終的に **32バイト** にならないと失敗

## 復号に失敗するケースと対処

### 失敗ケース
- 暗号化キーが変更された
- DBに保存された暗号文が破損/途中で切れた
- 32バイトに満たないキーを設定した

### 対処
- 以前の `TOKEN_ENCRYPTION_KEY` に戻す
- 既存トークンを再認可して再保存（古い暗号文は破棄）
- 必要なら `provider_accounts.token_encrypted` を `NULL` にして再連携

## トークン更新（refresh）の方針
- `provider_accounts` に以下を保存
  - `token_encrypted`（アクセストークン）
  - `refresh_token_encrypted`（リフレッシュトークン）
  - `expires_at`（期限）
  - `scopes`（スコープ）
- 期限切れ時はリフレッシュを優先
- リフレッシュ不可/失敗時は再認可へ誘導
- プロバイダによってはrefreshが存在しないため、再認可導線を必ず用意

## 監査ログ方針
- `audit_logs` に以下を記録
  - だれが（`actor_user_id`）
  - どの組織で（`organization_id`）
  - 何をしたか（`action`）
  - 対象（`target_type` / `target_id`）
  - 追加情報（`metadata_json`）
- 機密情報（トークン等）は**絶対に記録しない**

## RLS（Row Level Security）方針

### 基本方針
- すべてのテーブルでRLSを有効化
- テナントアクセスは `memberships` による組織所属で制御
- 管理者（`system_admins`）は全権

### 最低限のポリシー案
- `organizations`: 所属メンバーのみ閲覧/編集
- `memberships`: 当人または同組織メンバーが閲覧、挿入は管理者のみ
- `locations`: 所属組織のみ閲覧/追加
- `provider_accounts`: 所属組織のみ閲覧/追加
- `posts`, `post_targets`: 所属組織のみ閲覧/追加
- `reviews`, `review_replies`: 所属ロケーションのみ閲覧/追加
- `audit_logs`: 管理者のみ閲覧/追加
