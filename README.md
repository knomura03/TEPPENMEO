# TEPPEN MEO

複数プロバイダ（Google Business Profile / Meta / Yahoo!プレイス / Apple Business Connect / Bing Maps / Yahoo! YOLP）を一元管理するMEO/SNS管理の最小版です。

## ローカル起動（Supabase作成〜SQL適用〜seedまで）

### 0) 前提
- Node.js 20系推奨
- pnpm（`corepack enable` で有効化）

```bash
node -v
corepack enable
pnpm -v
```

### 1) Supabaseプロジェクト作成
1. https://supabase.com にログイン
2. **New project** を作成
3. リージョンとDBパスワードを設定
4. 作成完了まで待機

### 2) 必要なキー取得
Supabaseダッシュボード → **Project Settings** → **API** から取得:
- `Project URL`
- `anon public key`
- `service_role key`（取り扱い注意）

### 3) SQLを適用（`0001_init.sql` + `0002_user_blocks.sql`）

#### 方法A: SQL Editor
1. Supabaseダッシュボード → **SQL Editor**
2. **New query**
3. `supabase/migrations/0001_init.sql` を全文貼り付け
4. **Run** で実行
5. 続けて `supabase/migrations/0002_user_blocks.sql` を貼り付け
6. **Run** で実行

#### 方法B: Supabase CLI
1. CLIをインストール
```bash
npm i -g supabase
supabase login
```
2. プロジェクトをリンク
```bash
supabase init
supabase link --project-ref <プロジェクトREF>
```
3. マイグレーション適用
```bash
supabase db push
```

### 4) 環境変数を設定
```bash
pnpm install
cp .env.example .env.local
```

`.env.local` に必須値を入力（下の表参照）

### 5) seed実行（管理ユーザー作成）
```bash
pnpm seed
```
- `SYSTEM_ADMIN_PASSWORD` が未設定の場合、コンソールに生成パスワードが表示されます

### 6) 起動
```bash
pnpm dev
```
- `http://localhost:3000` を開く
- `/auth/sign-in` でログイン（`SYSTEM_ADMIN_EMAIL` を使用）
- `/admin` で管理画面を確認

## 環境変数一覧（目的つき）

| 変数 | 必須 | 用途 | 取得/設定場所 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 必須 | Supabase API URL | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必須 | クライアント用公開キー | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | 必須 | サーバー管理操作用キー | 同上（取り扱い注意） |
| `TOKEN_ENCRYPTION_KEY` | 必須 | OAuthトークン暗号化キー | 手動生成（`docs/security.md`参照） |
| `APP_BASE_URL` | 推奨 | OAuthリダイレクト基準URL | `http://localhost:3000` など |
| `SYSTEM_ADMIN_EMAIL` | seed必須 | 管理ユーザー作成に使用 | 任意メールアドレス |
| `SYSTEM_ADMIN_PASSWORD` | 任意 | 管理ユーザー初期パスワード | 任意（未設定なら自動生成） |
| `PROVIDER_MOCK_MODE` | 任意 | モック運用の有効化 | `true/false` |
| `YAHOO_PLACE_ENABLED` | 任意 | Yahoo!プレイス有効化 | `true/false` |
| `APPLE_BUSINESS_CONNECT_ENABLED` | 任意 | Apple Business Connect有効化 | `true/false` |
| `GOOGLE_CLIENT_ID` | 任意 | Google OAuthクライアントID | GCPコンソール |
| `GOOGLE_CLIENT_SECRET` | 任意 | Google OAuthクライアントシークレット | GCPコンソール |
| `GOOGLE_REDIRECT_URI` | 任意 | Google OAuthリダイレクトURI | GCPコンソール |
| `META_APP_ID` | 任意 | Meta App ID | Meta Developers |
| `META_APP_SECRET` | 任意 | Meta App Secret | Meta Developers |
| `META_REDIRECT_URI` | 任意 | Meta OAuthリダイレクトURI | Meta Developers |
| `BING_MAPS_KEY` | 任意 | Bing Maps APIキー | Azure Portal |
| `YAHOO_YOLP_APP_ID` | 任意 | YOLP App ID | Yahoo! Developer |

## モックモードでできること / できないこと

### できること
- ログイン/画面遷移
- ロケーション一覧/詳細の表示
- プロバイダ接続画面の確認
- レビュー/投稿画面の表示（モックデータ）
- Bing/YOLP検索画面の表示（モック結果）

### できないこと
- 実際のOAuth接続
- 実APIによるレビュー取得/返信
- 実APIによる投稿作成

## よくあるエラーと対処

### Node/pnpmのバージョン不一致
- `node -v` が18以下の場合は20系に更新
- `corepack enable` 後に `pnpm -v` を確認

### Supabaseキー不足
- `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を再確認
- `SUPABASE_SERVICE_ROLE_KEY` が空だとseedが失敗

### `TOKEN_ENCRYPTION_KEY must be 32 bytes`
- 32バイト（256bit）で生成したキーを使用
- 例: `openssl rand -base64 32`

### `Invalid encrypted payload`
- 暗号化キー変更による復号失敗の可能性
- 既存トークンは再認可して再保存

## 開発時の注意（LANアクセス/警告抑制）
- `next.config.ts` で `turbopack.root` を明示済み
- `allowedDevOrigins` は `localhost` と `192.168.*.*` を許可
- 10.* など別の範囲でLANアクセスする場合は `allowedDevOrigins` に追加する

## E2E（Playwright）
- 初回のみ: `pnpm exec playwright install`
- 実行: `pnpm e2e`

## 開発運用（PR必須）
- 変更は必ずブランチ作成 → コミット → push → PR作成の順で進める
- main への直接pushは禁止（緊急時は理由を記録）
- PRでCI（lint/test/typecheck）がすべて成功することを確認
- PR本文に「変更点要約 / 動作確認手順（クリック順） / 実行コマンド結果 / 影響範囲とロールバック観点」を記載
- PR作成前に `git diff` `git status` を確認し、疑わしい文字列があれば `git grep` で検査

### GitHub main保護の推奨設定（リンク）
- GitHub Docs: 保護されたブランチの設定

## ドキュメント
- アーキテクチャ: `docs/architecture.md`
- セキュリティ: `docs/security.md`
- トラブルシューティング: `docs/runbooks/troubleshooting.md`
- 手動スモークテスト: `docs/runbooks/manual-smoke-test.md`
- main保護設定: `docs/runbooks/github-branch-protection.md`
- MCP（Playwright連携）: `docs/runbooks/mcp-playwright.md`
- Supabaseマイグレーション: `docs/runbooks/supabase-migrations.md`
- 監査ログ調査: `docs/runbooks/audit-log-debugging.md`
- 仕様（ユーザー）: `docs/spec/user-app.md`
- 仕様（管理）: `docs/spec/admin.md`
- 仕様（画面一覧）: `docs/spec/screens.md`
- 仕様（合格基準）: `docs/spec/acceptance.md`
- ロードマップ: `docs/roadmap.md`
- プロバイダ手順書: `docs/providers/*.md`

## 機能対応表（最小版想定）

| プロバイダ | OAuth接続 | ロケーション一覧 | レビュー取得 | レビュー返信 | 投稿作成 | インサイト | 検索 | 状態 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Google Business Profile | あり | 予定 | 予定 | 予定 | 予定 | 予定 | なし | モック + スキャフォールド |
| Meta（Facebook/Instagram） | あり | なし | なし | なし | 予定 | なし | なし | モック + スキャフォールド |
| Yahoo!プレイス | スタブ | スタブ | スタブ | スタブ | スタブ | スタブ | なし | パートナー限定 |
| Apple Business Connect | スタブ | スタブ | スタブ | スタブ | スタブ | スタブ | なし | パートナー限定 |
| Bing Maps | キー方式 | なし | なし | なし | なし | なし | あり | 検索のみ |
| Yahoo! YOLP | キー方式 | なし | なし | なし | なし | なし | あり | 検索のみ |

## スクリプト
- インストール: `pnpm install`
- 開発: `pnpm dev`
- リント: `pnpm lint`
- テスト: `pnpm test`
- 型チェック: `pnpm typecheck`
- シード: `pnpm seed`
- E2E: `pnpm e2e`
