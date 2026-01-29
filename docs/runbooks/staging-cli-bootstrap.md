# stagingをCLIで進める（最短・値は出さない）

## 目的
- staging環境を **CLI中心** で素早く立ち上げる
- 値は一切表示しない（変数名と状態のみ）

---

## 前提（必要なCLI）
- Supabase CLI
- Vercel CLI

インストール例（どちらかでOK）:
```bash
npm i -g supabase vercel
```

## 安全なログ管理（重要）
- CLIの出力に機密が含まれる可能性がある場合は、`.tmp/` にリダイレクトして保存します
  ```bash
  <コマンド> > .tmp/staging-cli.log
  ```
- `.tmp/` はコミット禁止です（`.gitignore` 対象）

---

## 1) CLIログイン
### Supabase
```bash
supabase login
```
- ブラウザ認証が表示されたら案内に従う

### Vercel
```bash
vercel login
```
- ブラウザ認証が表示されたら案内に従う

---

## 2) Supabase（staging作成とマイグレーション）
> 既にstagingプロジェクトがある場合は再利用します。

1) stagingプロジェクト作成（対話式）
```bash
supabase projects create
```
- regionは `ap-northeast-1`（Tokyo）推奨
- DBパスワードは **保存場所だけ決めて** 管理（値はここに書かない）

2) プロジェクトにリンク
```bash
supabase link --project-ref <STAGING_PROJECT_REF>
```

3) マイグレーション適用
```bash
supabase db push
```

4) 画面確認
- `/admin/diagnostics` でマイグレーション警告が消えていること

---

## 3) staging用の環境変数を用意（値は出さない）
1) テンプレを作成
```bash
cp .env.staging.local.example .env.staging.local
```
2) `.env.staging.local` に値を入力（値は表示・共有しない）

---

## 4) Vercelへ環境変数を投入（値は出さない）
1) 事前チェック
```bash
pnpm staging:check
```

2) Vercelへ投入
```bash
pnpm staging:vercel:env-push
```
- 既存の環境変数がある場合は、CLIの指示に従う
- 上書きが必要な場合は **Runbookの指示に従い** 手動で実施
- 既定の投入先は `preview` です（必要なら `STAGING_VERCEL_ENV` で変更）
- 上書きが必要な場合は `STAGING_VERCEL_FORCE=1` を使う（慎重に）

3) 実行メモ（任意）
```bash
pnpm staging:notes
```

---

## 5) stagingの動作確認
1) preflight
```bash
pnpm preflight --mode real --env staging
```

2) 画面での確認順
- `/admin/release`
- `/admin/diagnostics`
- `/admin/provider-health`
- `/app/setup`
- `/app/locations`
- `/app/reviews`

---

## 6) つまずいた時
- マイグレーション詰まり: `docs/runbooks/supabase-migrations-troubleshooting.md`
- ローカル/リモートの違い: `docs/runbooks/supabase-local-vs-remote.md`
- ポート/lock: `docs/runbooks/dev-server-port-lock.md`

---

## 参考
- staging全体の流れ: `docs/runbooks/release-master.md`
- staging/prodの最短手順: `docs/runbooks/staging-prod-env-setup.md`
