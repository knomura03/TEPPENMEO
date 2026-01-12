# Google Business Profile（GBP）

## API契約書
- `docs/providers/api-contracts.md` を参照

## 前提（必要アカウント/権限/審査）
- [ ] Googleアカウント（ビジネス用途推奨）
- [ ] GBPでロケーションを管理できる権限（オーナー/管理者）
- [ ] Google Cloudプロジェクト作成権限
- [ ] **APIアクセス申請が必須**（承認に時間がかかる）
  - 申請フォーム: https://developers.google.com/my-business/content/prereqs

## 画面操作の手順（クリック単位）

### 1) Google Cloudプロジェクト作成
- [ ] Google Cloud Console → **プロジェクトを選択** → **新しいプロジェクト**
- [ ] 名前を入力（例: `teppen-meo-prod`）
- [ ] **作成** をクリック

### 2) APIを有効化
- [ ] 左メニュー → **APIとサービス** → **ライブラリ**
- [ ] 以下を検索して **有効にする**
  - [ ] **Business Profile API**
  - [ ] **Business Profile Performance API**（インサイト用・任意）
  - [ ] **Business Profile Account Management**

### 3) OAuth同意画面の設定
- [ ] 左メニュー → **APIとサービス** → **OAuth同意画面**
- [ ] アプリの種類: **外部**
- [ ] アプリ名: `TEPPEN MEO`
- [ ] サポートメールを設定
- [ ] **スコープを追加**
  - [ ] `https://www.googleapis.com/auth/business.manage`
- [ ] **テストユーザー**に自分のメールを追加（検証中は必須）
- [ ] 必要に応じて**審査提出**

### 4) OAuthクライアントの作成
- [ ] 左メニュー → **APIとサービス** → **認証情報**
- [ ] **認証情報を作成** → **OAuth クライアント ID**
- [ ] アプリケーションの種類: **ウェブアプリケーション**
- [ ] **承認済みのリダイレクト URI** を追加
  - [ ] `http://localhost:3000/api/providers/google/callback`
  - [ ] `https://<本番ドメイン>/api/providers/google/callback`
- [ ] **作成** → `クライアントID` と `クライアントシークレット` を控える

### 5) GBP APIアクセス申請
- [ ] 申請フォームを提出
- [ ] 承認されるまで待機（数日〜数週間）

## 設定値
- **Redirect URI**
  - ローカル: `http://localhost:3000/api/providers/google/callback`
  - 本番: `https://<本番ドメイン>/api/providers/google/callback`
- **Scopes**
  - `https://www.googleapis.com/auth/business.manage`
- **Webhook**
  - 最小版では未使用

## 必要な環境変数（意味/取得場所）
- `GOOGLE_CLIENT_ID` : OAuthクライアントID（GCPコンソール）
- `GOOGLE_CLIENT_SECRET` : OAuthクライアントシークレット（GCPコンソール）
- `GOOGLE_REDIRECT_URI` : リダイレクトURI（上記設定値）
- `APP_BASE_URL` : アプリのベースURL（任意だが推奨）
- 公開URL（審査向け）
  - Privacy Policy: `https://<APP_BASE_URL>/privacy`
  - Terms of Service: `https://<APP_BASE_URL>/terms`
  - Data Deletion: `https://<APP_BASE_URL>/data-deletion`

## 動作確認手順（成功/失敗の見分け方）

### チェックリスト
- [ ] `.env.local` にGoogleの値が入っている
- [ ] `PROVIDER_MOCK_MODE=false`
- [ ] `/app/locations/{id}` の「Google ビジネス プロフィール」で**接続**を押す
- [ ] Googleの同意画面に遷移する
- [ ] 許可後、アプリに戻り**接続済み**表示になる
- [ ] 「ロケーション紐付け」でGBPロケーションを選択して紐付ける
- [ ] 「レビュー同期」を押してレビューが一覧に表示される
- [ ] レビューの返信フォームから返信を送信できる
- [ ] 「投稿作成」で**Googleに投稿**を選択して投稿できる
- [ ] 投稿履歴にGoogleターゲットが表示され、失敗時は原因/次にやることが出る

### 失敗時の確認ポイント
- リダイレクトURIが一致しているか
- スコープが追加されているか
- APIアクセスが承認済みか
- 画面に「再認可が必要」と出た場合は再接続する

## 実APIでレビュー同期/返信する手順（クリック単位）

### 1) GBPロケーションの紐付け
- [ ] `/app/locations/{id}` を開く
- [ ] 「Google Business Profile」カードの「ロケーション紐付け」を確認
- [ ] セレクトボックスから対象のGBPロケーションを選択
- [ ] **紐付けを更新** をクリック
- [ ] 「現在の紐付け」に選択内容が表示される

### 2) レビュー同期
- [ ] 「レビュー同期」をクリック
- [ ] 成功メッセージ「レビュー同期が完了しました（n件）」が表示される
- [ ] レビュー一覧にカードが表示される

### 3) レビュー返信
- [ ] レビューカード内の返信フォームにテキストを入力
- [ ] **返信を送信** をクリック
- [ ] 「返信済み」表示に切り替わる

## 実APIで投稿する手順（クリック単位）

### 1) GBPロケーションの紐付けを確認
- [ ] `/app/locations/{id}` を開く
- [ ] 「Google Business Profile」カードで紐付け状態を確認
- [ ] 未紐付けの場合は「ロケーション紐付け」を実行

### 2) 投稿作成
- [ ] 「投稿作成」エリアで本文を入力（必須）
- [ ] 「Googleに投稿」をオン
- [ ] 画像を付ける場合は以下のいずれかを選択
  - [ ] URL入力（画像URL）
  - [ ] ファイルアップロード（Storage経由）
- [ ] **投稿を送信** をクリック

### 3) 履歴確認
- [ ] 「投稿履歴」でGoogleターゲットが表示される
- [ ] 失敗時は原因/次にやることを確認
- [ ] 必要なら**再実行**を押して再投稿

## よくある詰まり（エラーメッセージ例と対処）

- `access_not_configured` / `API not enabled`
  - APIが有効化されていない → ライブラリから有効化

- `insufficientPermissions`
  - 申請が未承認 → 申請完了後に待機

- `redirect_uri_mismatch`
  - Google側のURIと完全一致していない → 末尾/ポート/httpsを確認

- `invalid_client`
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` が誤り

- `invalid_grant`
  - 認可コードが無効 → もう一度接続をやり直す

- `This app isn't verified`
  - 同意画面の審査/公開設定を確認

- `HTTP 401`
  - トークン期限切れ → 再接続でトークン更新

- `HTTP 403`
  - API承認または権限不足 → 承認完了後に再接続
- `HTTP 400`
  - 投稿本文/画像URLが不正 → 入力内容や画像URLの到達性を確認
- `画像URLの準備に失敗しました`
  - Storage設定不足/署名URL期限切れ → Storage設定を確認し再投稿

- `HTTP 429`
  - レート制限 → 時間をおいて再同期

## 承認待ち時の代替手順

### モック運用
- [ ] `PROVIDER_MOCK_MODE=true` にする
- [ ] 画面上で接続・レビュー・投稿の流れを確認

### 手動運用
- [ ] GBP管理画面でレビュー返信/投稿を手動実施
- [ ] TEPPEN MEO側は進捗管理のみ行う

## APIアクセス未承認時の挙動
- OAuth接続自体は成功する場合があります
- ただしGBP API未承認の場合、接続後に「API承認が必要」と表示されます
- 承認後に再接続するとエラー表示が解消されます

## 実装状況（現時点）
- OAuthフロー: 接続〜トークン保存まで実装済み
- リフレッシュ: 実装済み（期限近接時に更新）
- 実API呼び出し: ロケーション取得/レビュー同期/返信/投稿作成まで対応

## 追加の参考ドキュメント
- stagingリリース手順: `docs/runbooks/release-staging.md`
- 本番リリース手順: `docs/runbooks/release-production.md`
- 審査・設定の詳細手順: `docs/runbooks/google-gbp-approval-and-oauth-setup.md`
