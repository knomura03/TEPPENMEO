# 本番リリース手順（一本道）

## 前提
- stagingでの動作確認が完了している
- 本番用SupabaseプロジェクトとVercelプロジェクトを用意する
- 機密値はドキュメントに貼らない（設定済み/未設定のみ扱う）
- CLI中心で進める考え方は `docs/runbooks/staging-cli-bootstrap.md` を参考にする

## 1. Supabase（本番）
1. Supabaseダッシュボードで本番プロジェクトを作成
2. Project Settings → API で `Project URL` / `anon key` / `service_role key` を控える
3. ローカルでCLI実行
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <prod-ref>
   supabase db push
   ```
4. `/admin/diagnostics`（本番環境）でマイグレーション警告が無いことを確認

## 2. Storage（本番）
1. Supabase Storageでバケットを作成（private推奨、例: `teppen-media`）
2. Vercelの本番環境変数に `SUPABASE_STORAGE_BUCKET` を設定
3. `/admin/diagnostics` で Storage 設定済みが表示されることを確認

## 3. Vercel（本番）
1. Project Settings → Environment Variables に本番用の値を入力
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_BASE_URL`（本番ドメイン）
   - 公開ページ用: `PUBLIC_OPERATOR_NAME` / `PUBLIC_CONTACT_EMAIL` （任意で `PUBLIC_CONTACT_URL` / `PUBLIC_PRIVACY_EFFECTIVE_DATE` / `PUBLIC_TERMS_EFFECTIVE_DATE`）
   - `PROVIDER_MOCK_MODE` は原則 `false`（審査待ちなら `true` で運用も可）
   - Storage関連、`CRON_SECRET`（スケジュール有効時）
2. Deploy（mainブランチ）を実行

## 4. プロバイダ設定（本番）
- Google: リダイレクトURIに `https://<prod-domain>/api/auth/callback/google` を追加
- Meta: リダイレクトURIに `https://<prod-domain>/api/auth/callback/meta` を追加
- App Review/Advanced Accessが未完了の場合はモック運用を継続し、UIで注意表示する

## 5. preflight 実行
```bash
pnpm preflight --mode real
```
- 設定済み/未設定/要確認のみ出力（値は表示しない）
- 失敗したら exit code 1 で終了するためCIや手動確認で判定可能

## 6. 本番動作確認の順番（推奨）
1. `/admin/diagnostics`
2. `/admin/provider-health`
3. `/app/setup`
4. `/app/locations`
5. `/app/reviews`
6. `/admin/jobs`
7. `/admin/audit-logs`

## 7. トラブル時
- マイグレーション詰まり: `docs/runbooks/supabase-migrations-troubleshooting.md`
- ローカル/リモートの違い: `docs/runbooks/supabase-local-vs-remote.md`
- devサーバーのポート/ロック: `docs/runbooks/dev-server-port-lock.md`
