# Meta（Facebook Pages / Instagram）

## API契約書
- `docs/providers/api-contracts.md` を参照

## 前提（必要アカウント/権限/審査）
- [ ] Meta開発者アカウント
- [ ] Facebookページの管理者権限
- [ ] Instagramプロアカウント（ビジネス/クリエイター）
- [ ] App Review（Advanced Access）が必要な権限あり
- [ ] 本番利用はBusiness Verificationが求められる可能性あり

## 画面操作の手順（クリック単位）

### 1) Metaアプリ作成
- [ ] https://developers.facebook.com/apps にアクセス
- [ ] **アプリを作成**
- [ ] 種類: **ビジネス**
- [ ] アプリ名: `TEPPEN MEO`
- [ ] **アプリを作成**

### 2) 製品の追加
- [ ] 左メニュー → **製品**
- [ ] **Facebookログイン** を追加
- [ ] Instagram投稿を使う場合は **Instagram** を追加

### 3) OAuthリダイレクトURI設定
- [ ] 左メニュー → **Facebookログイン** → **設定**
- [ ] **有効なOAuthリダイレクトURI** に追加
  - [ ] `http://localhost:3000/api/providers/meta/callback`
  - [ ] `https://<本番ドメイン>/api/providers/meta/callback`

### 4) 権限の追加（Permissions）
- [ ] 左メニュー → **アプリレビュー** → **権限と機能**
- [ ] 以下を追加申請
  - [ ] `pages_show_list`
  - [ ] `pages_manage_posts`
  - [ ] `pages_read_engagement`
  - [ ] `instagram_basic`
  - [ ] `instagram_content_publish`

### 5) テストユーザー設定（開発中）
- [ ] 左メニュー → **ロール** → **テストユーザー**
- [ ] 自分のアカウントをテスターに追加

### 6) Instagram連携（必要な場合）
- [ ] Instagramアカウントを「プロアカウント」に切替
- [ ] FacebookページとInstagramアカウントを連携
  - [ ] Facebookページ → **設定** → **Instagram** → **接続**

### 7) App Review / Business Verification（本番）
- [ ] **アプリレビュー** で審査提出
- [ ] 必要に応じてBusiness Verificationを完了

## 設定値
- **Redirect URI**
  - ローカル: `http://localhost:3000/api/providers/meta/callback`
  - 本番: `https://<本番ドメイン>/api/providers/meta/callback`
- **Scopes（申請する権限）**
  - `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`
  - `instagram_basic`, `instagram_content_publish`
- **Webhook**
  - 最小版では未使用

## 必要な環境変数（意味/取得場所）
- `META_APP_ID` : アプリID（Meta Developers → アプリ設定）
- `META_APP_SECRET` : アプリシークレット（同上）
- `META_REDIRECT_URI` : リダイレクトURI（本番運用時は必須）
- `SUPABASE_STORAGE_BUCKET` : 画像アップロード用バケット名（Supabase Storage）
- `MEDIA_SIGNED_URL_TTL_SECONDS` : 署名URLの有効期限（秒）
- `MAX_UPLOAD_MB` : 画像アップロードの最大サイズ（MB）
- 公開URL（審査向け）
  - Privacy Policy: `https://<APP_BASE_URL>/privacy`
  - Terms of Service: `https://<APP_BASE_URL>/terms`
  - Data Deletion: `https://<APP_BASE_URL>/data-deletion`（Meta App Review で要求される場合があります）

## 画像アップロード（Supabase Storage）
### 前提
- [ ] Supabase Storage のバケットを作成済み（private）
- [ ] `SUPABASE_SERVICE_ROLE_KEY` が `.env.local` に設定済み
- [ ] `/admin/diagnostics` で **画像アップロード: 利用可能** を確認

### 画像アップロードの手順
- [ ] `/app/locations/{id}` を開く
- [ ] **Meta（Facebook/Instagram）** の投稿作成セクションへ移動
- [ ] **ファイルアップロード** を選択
- [ ] 画像ファイルを選択
- [ ] **画像をアップロード** をクリック
- [ ] プレビュー表示を確認

### 注意点
- 形式は PNG/JPEG/WebP/GIF のみ
- Instagram投稿は画像が必須（URL入力でもアップロードでも可）

## TEPPEN MEOでの接続/投稿手順

### 接続
- [ ] `PROVIDER_MOCK_MODE=false`
- [ ] `/app/locations/{id}` を開く
- [ ] **Meta 接続** をクリック
- [ ] Meta同意画面で権限を許可
- [ ] 画面に戻り **接続済み** を確認

### Facebookページ紐付け
- [ ] ロケーション詳細 → **Meta（Facebook/Instagram）**
- [ ] ページ候補から対象ページを選択
- [ ] **紐付けを更新** をクリック
- [ ] 「現在の紐付け」が更新されることを確認

### 投稿（Facebook）
- [ ] 投稿本文を入力
- [ ] （任意）画像URL入力またはファイルアップロード
- [ ] **Facebookに投稿** をオン
- [ ] **投稿を送信**

### 投稿（Instagram）
- [ ] FacebookページとInstagramが連携済みであることを確認
- [ ] 画像URL入力またはファイルアップロード（必須）
- [ ] **Instagramに投稿** をオン
- [ ] **投稿を送信**

## 動作確認手順（成功/失敗の見分け方）
- [ ] 接続後に **接続済み** 表示になる
- [ ] ページ紐付け後に **現在の紐付け** が表示される
- [ ] 投稿送信後、投稿一覧に **公開済み** が追加される

## よくある詰まり（エラーメッセージ例と対処）

- `Invalid redirect_uri`
  - OAuth設定のURIを完全一致で登録

- `App not active`
  - アプリを公開モードに切り替える

- `OAuthException (code 190)`
  - トークンが無効。再認可を実施

- `(#200) Requires pages_manage_posts permission`
  - 権限が未承認。App Reviewで権限追加

- Instagramに投稿できない
  - IGがプロアカウントか確認
  - FacebookページとIGが連携済みか確認
  - 画像が指定されているか確認

- 画像アップロードが失敗する
  - `SUPABASE_STORAGE_BUCKET` の設定を確認
  - `SUPABASE_SERVICE_ROLE_KEY` の設定を確認
  - 画像サイズ/形式（PNG/JPEG/WebP/GIF）を確認

## 承認が必要で今日できない場合の代替手順

### モック運用
- [ ] `PROVIDER_MOCK_MODE=true` で画面フロー確認

### 手動運用
- [ ] Facebook/Instagram側で投稿を手動実施
- [ ] TEPPEN MEO は投稿履歴管理のみ

## 実装状況（現時点）
- OAuthフロー: 実装済み（state検証/トークン暗号化保存/期限管理）
- Facebookページ紐付け: 実装済み
- Facebook投稿: 実装済み（本文+画像）
- Instagram投稿: 画像必須/ページ連携必須（最小実装）

## トークンの扱い（補足）
- OAuth直後に長期トークンへ交換を試みる
- 有効期限が近い場合は再認可が必要になる
- 失敗時は「再認可が必要」と表示されるため、再接続で復旧する

## 追加の参考ドキュメント
- stagingリリース手順: `docs/runbooks/release-staging.md`
- 本番リリース手順: `docs/runbooks/release-production.md`
- 審査・設定の詳細手順: `docs/runbooks/meta-app-review-and-oauth-setup.md`
