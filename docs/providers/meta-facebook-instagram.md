# Meta（Facebook Pages / Instagram）

## 前提（必要アカウント/権限/審査）
- [ ] Meta開発者アカウント
- [ ] Facebookページの管理者権限
- [ ] Instagramプロアカウント（ビジネス/クリエイター）
- [ ] **App Review（Advanced Access）が必要な権限あり**
- [ ] 本番利用にはBusiness Verificationが求められる可能性あり

## 画面操作の手順（クリック単位）

### 1) Metaアプリ作成
- [ ] https://developers.facebook.com/apps にアクセス
- [ ] **アプリを作成** → 種類: **ビジネス**
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
- `META_REDIRECT_URI` : リダイレクトURI

## 動作確認手順（成功/失敗の見分け方）

### チェックリスト
- [ ] `.env.local` にMetaの値が入っている
- [ ] `PROVIDER_MOCK_MODE=false`
- [ ] `/app/locations/{id}` から Meta の**接続**を実行
- [ ] Metaの同意画面に遷移する
- [ ] 許可後、アプリに戻り**接続済み**表示になる

### 失敗時の確認ポイント
- リダイレクトURIが一致しているか
- 必要権限が承認されているか
- アプリが「開発」モードのままか（本番は「公開」必要）

## よくある詰まり（エラーメッセージ例と対処）

- `Invalid redirect_uri`
  - OAuth設定のURIを完全一致で登録

- `App not active`
  - アプリを公開モードに切り替える

- `Missing permissions`
  - App Reviewで権限が承認済みか確認

- `Permissions error`（Instagram投稿時）
  - IGプロアカウント連携が完了しているか確認

## 承認待ち時の代替手順

### モック運用
- [ ] `PROVIDER_MOCK_MODE=true` で画面フロー確認

### 手動運用
- [ ] Facebook/Instagram側で投稿を手動実施
- [ ] TEPPEN MEO は進捗管理のみ

## 実装状況（現時点）
- OAuthフロー: スキャフォールド済み
- 実投稿API: 未実装（今後対応）
