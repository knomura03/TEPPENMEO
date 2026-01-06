# Google Business Profile（GBP）

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

## 動作確認手順（成功/失敗の見分け方）

### チェックリスト
- [ ] `.env.local` にGoogleの値が入っている
- [ ] `PROVIDER_MOCK_MODE=false`
- [ ] `/app/locations/{id}` の「Google ビジネス プロフィール」で**接続**を押す
- [ ] Googleの同意画面に遷移する
- [ ] 許可後、アプリに戻り**接続済み**表示になる

### 失敗時の確認ポイント
- リダイレクトURIが一致しているか
- スコープが追加されているか
- APIアクセスが承認済みか

## よくある詰まり（エラーメッセージ例と対処）

- `access_not_configured` / `API not enabled`
  - APIが有効化されていない → ライブラリから有効化

- `insufficientPermissions`
  - 申請が未承認 → 申請完了後に待機

- `redirect_uri_mismatch`
  - Google側のURIと完全一致していない → 末尾/ポート/httpsを確認

- `invalid_client`
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` が誤り

- `This app isn't verified`
  - 同意画面の審査/公開設定を確認

## 承認待ち時の代替手順

### モック運用
- [ ] `PROVIDER_MOCK_MODE=true` にする
- [ ] 画面上で接続・レビュー・投稿の流れを確認

### 手動運用
- [ ] GBP管理画面でレビュー返信/投稿を手動実施
- [ ] TEPPEN MEO側は進捗管理のみ行う

## 実装状況（現時点）
- OAuthフロー: スキャフォールド済み
- 実API呼び出し: 未実装（今後対応）
