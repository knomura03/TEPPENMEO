# プロバイダ審査前チェックリスト（Google/Meta想定）

## 公開ページ
- [ ] プライバシーポリシー: `/privacy`
- [ ] 利用規約: `/terms`
- [ ] データ削除手順: `/data-deletion`（Metaで要求される場合あり）
- [ ] APP_BASE_URL に公開ドメインを設定し、各URLが閲覧できる
- [ ] 運営者情報/連絡先を環境変数で設定  
  - PUBLIC_OPERATOR_NAME / PUBLIC_CONTACT_EMAIL  
  - 必要に応じて PUBLIC_CONTACT_URL / PUBLIC_PRIVACY_EFFECTIVE_DATE / PUBLIC_TERMS_EFFECTIVE_DATE

## ドメインとリダイレクトURI
- [ ] staging/prod のドメインが確定している
- [ ] Google OAuth: `https://<domain>/api/auth/callback/google`
- [ ] Meta OAuth: `https://<domain>/api/auth/callback/meta`

## テストユーザー
- [ ] Google: 必要ならテストユーザーを用意
- [ ] Meta: アプリロール/テスターを追加し、審査ユーザーがログイン可能

## モック運用（審査待ち）
- [ ] PROVIDER_MOCK_MODE=true で画面が崩れない
- [ ] `/admin/diagnostics` に未承認/未設定の注意が表示される

## 参考
- stagingリリース: `docs/runbooks/release-staging.md`
- 本番リリース: `docs/runbooks/release-production.md`
