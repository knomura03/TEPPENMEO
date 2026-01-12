# Meta（Facebook/Instagram）App Review・OAuth 設定手順（超詳細）

## 目的
- FBページ/IGへの投稿を実機で行える状態にする
- App Reviewに必要な公開URL・Redirect URI・権限設定を漏れなく行う

## 前提
- Meta Developers アカウント
- 対象Facebookページの管理権限
- IGプロフェッショナルアカウントがページに紐付いている（IG投稿を行う場合）
- 公開ページ（/privacy /terms /data-deletion）が閲覧できること

## 手順（クリック/入力単位）
1. **アプリ作成/確認**  
   - Meta Developers → 「My Apps」→ 該当アプリ選択（新規作成でも可）
2. **Appドメイン/公開URL設定**  
   - 「Settings」→「Basic」  
   - App Domains: `<staging-domain>`, `<prod-domain>`  
   - Privacy Policy URL: `https://<domain>/privacy`  
   - Terms URL: `https://<domain>/terms`  
   - Data Deletion URL: `https://<domain>/data-deletion`  
   - 連絡先メールを入力
3. **Facebook Login（OAuth）**  
   - 「Products」→「Facebook Login」→「Settings」  
   - Valid OAuth Redirect URIs に追加  
     - `https://<staging-domain>/api/providers/meta/callback`  
     - `https://<prod-domain>/api/providers/meta/callback`  
     - 必要なら `http://localhost:3000/api/providers/meta/callback`  
   - Deauthorize Callback は未使用（必要なら後続PRで対応）
4. **権限/機能（Permissions）**  
   - 必須: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`  
   - 「App Review」→「Permissions and Features」で必要な権限を「Request」  
   - 申請時に提出するURL: `/privacy`, `/terms`, `/data-deletion`
5. **テスター/ロール設定**  
   - 「Roles」→「Testers」または「Users」→ テストユーザーを追加  
   - 審査で指定されたテスターがログインできるか確認
6. **環境変数設定（値はプレースホルダのみ）**  
   - `META_CLIENT_ID=`  
   - `META_CLIENT_SECRET=`  
   - `META_REDIRECT_URI=`（prod/stagingのいずれかを指定）  
   - `APP_BASE_URL=`（公開ドメイン）  
   - 公開情報: `PUBLIC_OPERATOR_NAME` / `PUBLIC_CONTACT_EMAIL` など
7. **TEPPEN MEO での確認手順**  
   - `/admin/diagnostics` で権限不足/未設定がないか確認（権限差分を参照）  
   - `/admin/provider-health` でMeta読み取りAPIが成功することを確認  
   - `/app/setup` で接続/紐付け/投稿の導線を確認  
   - `/app/locations/loc-1` 等で接続→FBページ紐付け→投稿（画像アップロード含む）を実行  
   - IG投稿を行う場合は、IG連携条件（プロフェッショナル＋FBページ紐付け）を満たしているか確認

## 典型エラーと対処
- 401/403: 権限不足/再認可 → App Review状況・権限付与を確認し再認可
- `OAuthException`: Redirect URIの不一致 → Facebook Login設定を確認
- `Unsupported get request`（IG関連）: IGプロフェッショナル設定やページ紐付けを確認
- レート制限: 時間をおいて再実行

## 審査提出の準備
- 動作確認動画/スクショ: 接続→紐付け→投稿の流れを用意
- テストユーザーでログイン可能なことを確認
- 審査質問例: 「どの機能でどの権限を使うか」を説明（投稿/返信/一覧など）

## モック→実機切替の要点
- `PROVIDER_MOCK_MODE=false` に変更し、`pnpm preflight --mode real` で不足を確認（値は出ない）
- `/admin/diagnostics` で権限差分や未設定の注意を確認
- 未承認で進めない場合はモック運用（`PROVIDER_MOCK_MODE=true`）で画面確認のみを行う
