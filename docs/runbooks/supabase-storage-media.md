# Supabase Storage（画像アップロード）運用手順

## 目的
- Meta投稿で画像をURL入力ではなくファイルアップロードで運用する
- 署名付きURLを使い、private bucketで安全に配布する

## 前提
- Supabaseプロジェクトを作成済み
- `SUPABASE_SERVICE_ROLE_KEY` が `.env.local` に設定済み
- system admin で `/admin/diagnostics` にアクセスできる

## バケット作成（クリック手順）
1) Supabaseダッシュボードを開く
2) 左メニュー **Storage** をクリック
3) **Create a new bucket** をクリック
4) バケット名を入力（例: `teppen-media`）
5) **Private bucket** を選択
6) **Create bucket** をクリック

## 環境変数の設定
- `.env.local` に追加
  - `SUPABASE_STORAGE_BUCKET=teppen-media`
  - `MEDIA_SIGNED_URL_TTL_SECONDS=3600`（署名URLの有効期限）
  - `MAX_UPLOAD_MB=10`（最大アップロードサイズ）

## ローカル確認手順
- [ ] `pnpm dev` を起動
- [ ] `/admin/diagnostics` で「画像アップロード: 利用可能」を確認
- [ ] `/app/locations/loc-1` → **Meta（Facebook/Instagram）**
- [ ] **ファイルアップロード** を選択
- [ ] 画像を選択して **画像をアップロード** をクリック
- [ ] プレビューが表示されることを確認

## よくある失敗
### `画像アップロードの設定が未完了です`
- `SUPABASE_STORAGE_BUCKET` が未設定
- `SUPABASE_SERVICE_ROLE_KEY` が未設定

### `画像ファイル以外はアップロードできません`
- 画像以外のファイルが選択されている
- 対応形式: PNG/JPEG/WebP/GIF

### `画像サイズが上限を超えています`
- `MAX_UPLOAD_MB` を確認する
- サイズを縮小して再アップロードする

## 署名URLの方針
- private bucket を前提に、投稿直前に署名URLを発行する
- 署名URLは短命（既定3600秒）で運用する
