# stagingリリース手順（クリック/入力単位）

## 前提
- Supabaseプロジェクト（staging用）が作成済み
- VercelでGitHub連携が済んでいる
- `.env.local` の値をそのまま流用せず、staging用の値を用意する（機密は貼らない）

## 1. Supabase（staging）
1. Supabaseダッシュボードにログイン
2. stagingプロジェクトを作成
3. Project Settings → API で `Project URL` と `anon key` と `service_role key` を控える（値はメモのみ、ドキュメントに貼らない）
4. ローカルでCLI準備
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <staging-ref>
   supabase db push
   ```
5. `/admin/diagnostics` でマイグレーション警告が無いことを確認

## 2. Storage（staging）
1. Supabase Storageでバケットを作成（private推奨、例: `teppen-media`）
2. `.env.local` 相当のstaging環境変数に `SUPABASE_STORAGE_BUCKET` を設定（値はデプロイ先で入力）
3. `/admin/diagnostics` で「Storage設定済み」が表示されることを確認

## 3. Vercel（staging）
1. GitHubリポジトリをImport（既存なら省略）
2. Project Settings → Environment Variables に staging用の環境変数を入力（値は貼らない）
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_BASE_URL`（例: stagingドメイン）
   - `PROVIDER_MOCK_MODE`（モック運用なら `true`）
   - Storage関連: `SUPABASE_STORAGE_BUCKET` / `MEDIA_SIGNED_URL_TTL_SECONDS` など
   - スケジュールが必要なら `CRON_SECRET`
3. Deployを実行（自動もしくは手動）

## 4. プロバイダ設定（staging）
- Google: OAuthクライアントのリダイレクトURIに `https://<staging-domain>/api/auth/callback/google` を追加
- Meta: AppのリダイレクトURIに `https://<staging-domain>/api/auth/callback/meta` を追加
- 審査待ちの場合はモック運用を許可し、UIに「未承認」を明示する

## 5. 最終確認（推奨の確認順）
1. `/admin/diagnostics` で環境/マイグレーション/Storage/CRONが「設定済み」になっている
2. `/admin/provider-health` でモック/実機に応じたヘルス表示を確認
3. `/app/setup` で進捗カードが表示される
4. `/app/locations` で一覧が表示される
5. `/app/reviews` で受信箱が表示される
6. `/admin/jobs` でジョブ履歴が表示される
7. `/admin/audit-logs` で監査ログが表示される

## 6. preflight の実行
```bash
pnpm preflight --mode mock   # モック運用の場合
pnpm preflight --mode real   # 実機運用の場合
```
- 値は表示されず、設定済み/未設定/要確認のみ出力

## 7. トラブル時
- マイグレーション詰まり: `docs/runbooks/supabase-migrations-troubleshooting.md`
- ローカル/リモートの違い: `docs/runbooks/supabase-local-vs-remote.md`
- devサーバーのポート/ロック: `docs/runbooks/dev-server-port-lock.md`
