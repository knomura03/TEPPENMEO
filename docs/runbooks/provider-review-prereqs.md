# プロバイダ審査前のチェックリスト（Google/Meta向け）

## 公開ページ
- [ ] プライバシーポリシー: `/privacy`
- [ ] 利用規約: `/terms`
- [ ] データ削除手順: `/data-deletion`（Meta審査で要求される場合あり）
- [ ] APP_BASE_URL に公開ドメインを設定し、各URLが閲覧できる
- [ ] 運営者/連絡先（PUBLIC_OPERATOR_NAME / PUBLIC_CONTACT_EMAIL）が設定済み
- [ ] 詳細手順: `docs/runbooks/google-gbp-approval-and-oauth-setup.md` / `docs/runbooks/meta-app-review-and-oauth-setup.md`

## ドメインとリダイレクトURI
- [ ] staging/prod のドメインが確定している
- [ ] Google OAuth リダイレクトURIに `https://<domain>/api/auth/callback/google` を登録
- [ ] Meta OAuth リダイレクトURIに `https://<domain>/api/auth/callback/meta` を登録

## テストユーザー
- [ ] Google: 必要な場合はテストユーザーを用意
- [ ] Meta: アプリロール/テスターを追加し、審査用ユーザーがログイン可能

## モック運用（審査待ち）
- [ ] PROVIDER_MOCK_MODE=true で画面が崩れない
- [ ] `/admin/diagnostics` に未承認/未設定の注意が表示される

## 参考
- stagingリリース手順: `docs/runbooks/release-staging.md`
- 本番リリース手順: `docs/runbooks/release-production.md`
