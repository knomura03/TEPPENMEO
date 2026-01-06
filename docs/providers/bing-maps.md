# Bing Maps

## 前提
- [ ] Microsoft Azureアカウント
- [ ] Bing Mapsリソース作成権限

## 画面操作の手順（クリック単位）
- [ ] Azure Portal https://portal.azure.com にログイン
- [ ] **リソースの作成** → **Bing Maps**
- [ ] 名前/リージョン/課金プランを選択
- [ ] 作成後、**キーとエンドポイント** を開く
- [ ] **Primary key** をコピー

## 設定値
- 追加設定は不要
- TEPPEN MEOは検索用途のみ（管理機能なし）

## 必要な環境変数
- `BING_MAPS_KEY` : Bing Maps APIキー

## 動作確認手順
- [ ] `/app/locations` の検索フォームで **Bing Maps** を選択
- [ ] キーワード検索で候補が表示されれば成功

## よくある詰まり
- キー未設定: `BING_MAPS_KEY` を確認
- 検索結果が空: キーワードを変える/英語表記を試す
