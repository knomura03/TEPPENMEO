# Google Business Profile 承認・OAuth 設定手順（超詳細）

## 目的
- GBPの投稿/レビュー同期/返信を実機で行える状態にする
- 審査で求められる公開URLやRedirect URIを漏れなく設定する

## 前提
- Googleアカウント（ビジネス利用推奨）
- GBPでロケーション管理権限（オーナー/管理者）
- Google Cloud Consoleのプロジェクト作成/編集権限
- 公開ページ（/privacy /terms /data-deletion）が閲覧できること

## 手順（クリック/入力単位）
1. **プロジェクト作成**  
   - Google Cloud Console → 「プロジェクトを選択」→「新しいプロジェクト」  
   - 名前例: `teppen-meo-prod` → 「作成」
2. **API有効化**  
   - 左メニュー「APIとサービス」→「ライブラリ」  
   - 有効化: Business Profile API / Business Profile Performance API（任意） / Business Profile Account Management
3. **OAuth同意画面**  
   - 「APIとサービス」→「OAuth同意画面」  
   - アプリ種類: 外部 → アプリ名: `TEPPEN MEO` → サポートメール入力  
   - スコープ追加: `https://www.googleapis.com/auth/business.manage`  
   - テストユーザーに自分のメールを追加（審査前は必須）  
   - 公開URL設定: Privacy `/privacy`, Terms `/terms`, Data Deletion `/data-deletion`（ドメインは環境に合わせる）
4. **OAuthクライアント作成**  
   - 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアントID」  
   - 種類: ウェブアプリケーション  
   - Redirect URI に追加  
     - `https://<staging-domain>/api/providers/google/callback`  
     - `https://<prod-domain>/api/providers/google/callback`  
     - ローカル確認用（必要なら）`http://localhost:3000/api/providers/google/callback`  
   - 生成されたクライアントID/シークレットを控える（値はcommitしない）
5. **環境変数設定（例はプレースホルダのみ）**  
   - `GOOGLE_CLIENT_ID=`（例: `xxxx.apps.googleusercontent.com`）  
   - `GOOGLE_CLIENT_SECRET=`  
   - `GOOGLE_REDIRECT_URI=`（prod/stagingのいずれかを指定）  
   - `APP_BASE_URL=`（公開ドメイン）  
   - 公開情報: `PUBLIC_OPERATOR_NAME` / `PUBLIC_CONTACT_EMAIL` など
6. **TEPPEN MEO での確認手順**  
   - `/admin/diagnostics` で環境と公開情報が「設定済み」になることを確認  
   - `/admin/provider-health` でGoogleの読み取りAPIが成功すること（再認可が不要か確認）  
   - `/app/setup` で接続/紐付け/投稿テストの導線を確認  
   - `/app/locations/loc-1` などで接続→紐付け→投稿→レビュー同期→返信を実行

## 典型エラーと対処
- 401/403: スコープ不足・API未承認 → 同意画面/申請状況を確認し再認可
- `redirect_uri_mismatch`: GCPのURIと完全一致させる（スキーム/末尾/ポート）
- `invalid_grant`: 認可コード期限切れ → 再接続
- `access_not_configured`: API有効化・申請承認を確認
- 429: 時間をおいて再実行

## モック→実機切替の要点
- `PROVIDER_MOCK_MODE=false` に変更し、`pnpm preflight --mode real` で不足を確認（値は出ない）
- `/admin/diagnostics` でスコープ不足やAPI未承認の注意を確認
- 未承認で進めない場合はモック運用（`PROVIDER_MOCK_MODE=true`）に戻す
