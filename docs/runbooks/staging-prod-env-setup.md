# staging / prod 環境準備（最短手順）

## 目的
- staging / prod で迷わず初期設定を完了し、審査・運用を開始できる状態にする

## 前提
- Supabase と Vercel のアカウントがある
- リポジトリがGitHubに連携済み
- この手順では **値を表示しない**（設定済み/未設定のみ確認）
- CLIで最短に進めたい場合は `docs/runbooks/staging-cli-bootstrap.md` を参照

---

## 1) Supabase（作成 → link → マイグレーション）
1) Supabaseで **新規プロジェクト** を作成する
2) ターミナルで `supabase link` を実行する（対象プロジェクトを選択）
3) `supabase db push` を実行する
4) `/admin/diagnostics` でマイグレーション警告が消えることを確認する

---

## 2) Storage（画像アップロード）
1) Supabaseの **Storage** でバケットを作成する
2) `.env.local` / Vercel環境変数にバケット名を設定する
3) `/admin/diagnostics` で「Storageが利用可能」になることを確認する

---

## 3) Vercel（デプロイと環境変数）
1) Vercelでリポジトリをインポートする
2) **Environment Variables** に必要な変数を登録する（値は表示しない）
3) デプロイ完了後、`APP_BASE_URL` が **https** で始まることを確認する
4) `/admin/release` → 「登録情報テンプレ」を確認する

---

## 4) Google / Meta（Redirect URI / 公開URL）
1) `/admin/release` の「登録情報テンプレ」を開く
2) Google/Meta 管理画面で Redirect URI を設定する
3) 公開ページURL（privacy/terms/data-deletion）を登録する
4) `/admin/provider-health` で接続と権限を確認する

---

## 5) preflight で最終チェック
1) `pnpm preflight --mode real --env staging` または `--env prod` を実行する
2) NG が出た項目を修正する（値は表示されない）

---

## 6) 画面での最終確認（クリック順）
1) `/admin/release`
2) `/admin/diagnostics`
3) `/admin/provider-health`
4) `/app/setup`
5) `/app/locations`
6) `/app/reviews`

---

## よくある詰まり
- **APP_BASE_URL が http のまま**
  - staging/prod では https が必須です
- **Supabaseのマイグレーション警告が消えない**
  - `supabase db push` を実行し、再度確認してください
- **OAuthのリダイレクトエラー**
  - Redirect URI が一致しているか、`/admin/release` のテンプレを再確認してください

## 注意
- トークン/シークレット/署名URLの完全値は共有・記録しない
