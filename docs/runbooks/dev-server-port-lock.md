# devサーバーのポート競合/ロック解除

## 目的
- `pnpm dev` が起動しない、`pnpm e2e` が待ち続ける問題を素早く解決する

## よくある症状
- **port 3000 使用中** で起動できない
- **.next/dev/lock の取得失敗**

## 手順（Mac想定）
### 1) ポート使用中か確認
```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

### 2) PIDの正体を確認
```bash
ps -p <PID> -o pid,command
```

### 3) 該当プロセスを停止
```bash
kill <PID>
```
止まらない場合のみ:
```bash
kill -9 <PID>
```

### 4) next dev 二重起動の確認
```bash
pgrep -fl "next dev"
```

### 5) ロックファイルの削除
```bash
rm -f .next/dev/lock
```

### 6) 直らない場合の最終手段
```bash
rm -rf .next
```

### 7) 再起動
```bash
pnpm dev
```

## やってはいけないこと
- 別アプリのPIDを誤って停止しない
- `rm -rf .next` を連続実行しない（必要最小限で）

## 補足
- E2Eは `scripts/ensure-port-free.mjs` で事前チェックします
- 事前チェックで失敗した場合は上記手順を先に実施してください
