# リリース手順（staging→審査→prod）

この手順は **staging から本番（prod）までを一本道で進める**ための親Runbookです。  
値はここに書かず、**変数名と取得場所のみ**記載します。

---

## A. stagingを作る（環境構築）
### 最短ルート（CLI）
- `docs/runbooks/staging-cli-bootstrap.md` を順番通りに実行

### 1) Supabase
- [ ] Supabaseでプロジェクトを作成する
- [ ] **migrations を適用**する  
  - 推奨: `supabase db push --linked`
- [ ] Storage バケットを作成する（画像アップロード用）
- [ ] Service role / anon key を取得する（値は記録しない）
- [ ] 自動同期を使うなら `CRON_SECRET` を用意する

### 2) Vercel
- [ ] GitHub連携でデプロイ先を作成する
- [ ] 環境変数を設定する（値は書かない）
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_BASE_URL`
  - `PUBLIC_OPERATOR_NAME`
  - `PUBLIC_CONTACT_EMAIL`
  - `PUBLIC_CONTACT_URL`（任意）
  - `PUBLIC_PRIVACY_EFFECTIVE_DATE`（任意）
  - `PUBLIC_TERMS_EFFECTIVE_DATE`（任意）
  - `CRON_SECRET`（必要な場合）
- [ ] `APP_BASE_URL` を staging のURLに合わせる

### 3) OAuthの準備
- [ ] Google / Meta の Redirect URI を **staging用URL**で登録する  
  - 例: `<APP_BASE_URL>/api/providers/google/callback`  
  - 例: `<APP_BASE_URL>/api/providers/meta/callback`
- [ ] 公開URL（/privacy /terms /data-deletion）が参照できることを確認する

---

## B. stagingで「実機確認」する（動作確認）
### 1) preflight
- [ ] `pnpm preflight --mode real --env staging`
- [ ] 失敗したら /admin/release → /admin/diagnostics → /admin/provider-health の順で確認

### 2) 実機スモーク（詳細はRunbookへ）
- [ ] 実機スモークの手順: `docs/runbooks/real-mode-smoke-test.md`
- [ ] 受信箱の実機確認: `docs/runbooks/inbox-real-mode-check.md`

---

## C. 審査に出す（Google/Meta）
### 1) Google
- [ ] `docs/runbooks/google-gbp-approval-and-oauth-setup.md` を順番に実行

### 2) Meta
- [ ] `docs/runbooks/meta-app-review-and-oauth-setup.md` を順番に実行

### 3) 公開ページ確認
- [ ] `/privacy` `/terms` `/data-deletion` を staging で確認

### 4) 証跡テンプレ
- [ ] `docs/runbooks/staging-real-smoke-evidence.md` に結果を記録

---

## D. prodへ展開する（本番準備）
### 1) 環境構築
- [ ] Supabase/Storage/Cron を staging と同じ観点で用意
- [ ] Vercelの環境変数を **prod用**に設定
- [ ] OAuth Redirect URI を **prod用URL**で登録

### 2) preflight
- [ ] `pnpm preflight --mode real --env prod`

### 3) 本番スモーク（最低限）
- [ ] Google: 口コミ取得/返信/投稿
- [ ] Meta: コメント取得/返信/投稿
- [ ] Jobs: 一括同期 → 履歴確認

---

## E. リリース後の運用（最小）
- 毎日見る場所:
  - /app/reviews（受信箱）
  - /admin/jobs（ジョブ履歴）
  - /admin/audit-logs（監査ログ）
- 事故時の初動:
  - /admin/release → /admin/diagnostics → /admin/provider-health
