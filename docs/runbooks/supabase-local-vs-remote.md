# Supabaseローカルとリモートの違い（迷わないための整理）

## 結論
- `supabase status` は **ローカル開発環境の状態確認** 用です  
- **リモート運用だけなら `supabase status` は不要** です  
- ローカルを使う場合は **Docker互換ランタイムが必須** です

## ローカル開発（Docker前提）
対象:
- `supabase start` / `supabase status` / `supabase stop` を使う場合

前提:
- Docker Desktop などのDocker互換ランタイムが必要

よくあるエラー:
- `Cannot connect to the Docker daemon`
  - 原因: Dockerが起動していない
  - 対処: Dockerを起動してから再実行

## リモート運用（--linked）
対象:
- `supabase link` 済みのリモートDBに対して `supabase db push` する場合

ポイント:
- **`supabase status` は不要**
- `supabase db push` だけでマイグレーション適用が可能

## まとめ
- ローカル環境を使うならDockerが必須  
- リモート運用だけならDocker不要  
- 迷ったら `docs/runbooks/supabase-migrations.md` を先に参照する
