# staging実行の証跡テンプレ（貼り付け用）

## 目的
- staging（またはprod）での実行結果を「証跡」として残す
- 値や機密は記録せず、**項目名とOK/NG** だけを残す

---

## 1) 事前確認（値は書かない）
- [ ] APP_BASE_URL が staging/prod のURLである（https）
- [ ] PUBLIC_* が設定済み
- [ ] Supabase 接続OK

---

## 2) preflight（貼り付け枠）
実行コマンド:
- `pnpm preflight --mode real --env staging`

貼り付けテンプレ（値は禁止）:
```
preflight: OK / NG
不足項目: （あれば項目名のみ）
備考: （必要なら）
```

---

## 3) provider-health（貼り付け枠）
操作手順:
1) `/admin/provider-health` を開く
2) Google / Meta の結果を確認する

貼り付けテンプレ（値は禁止）:
```
Google: OK / 注意 / NG
Meta: OK / 注意 / NG
原因（あれば簡潔に）:
次にやること:
```

---

## 4) 実機スモーク（チェックリスト）
### Google（口コミ）
- [ ] 口コミを取得できる
- [ ] 返信を送れる

### Meta（コメント）
- [ ] Facebookコメントを取得できる
- [ ] Facebookコメントへ返信できる
- [ ] Instagramコメントを取得できる
- [ ] Instagramコメントへ返信できる

### 投稿（最小確認）
- [ ] 投稿が成功する（Google / Facebook / Instagram のいずれか）

チェック結果メモ（時刻のみ）:
```
日時: YYYY/MM/DD HH:mm
結果: OK / NG
備考:
```

---

## 5) 失敗時の分岐
- **403 / 権限不足**
  - 次にやること: 権限を追加する / 再接続する
- **redirect不一致**
  - 次にやること: `/admin/release` のテンプレで Redirect URI を再設定する
- **審査待ち**
  - 次にやること: 審査の進行状況を確認する

---

## 注意
- トークン/シークレット/署名URL/メール本文などの**値は書かない**
- 記録は「OK/NG」と簡単な理由だけにする
