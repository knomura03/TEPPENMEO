# トラブルシューティング

## OAuthリダイレクト不一致
- プロバイダ側のリダイレクトURIが完全一致しているか確認
- 末尾スラッシュ/ポート違いに注意

## 権限/審査不足
- 必要スコープが承認済みか確認
- App Review / Advanced Access の申請状況を確認

## プロバイダ未設定
- `/admin/providers` で不足している環境変数を確認
- `.env.local` を更新して再起動

## Supabase Authエラー
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を再確認
- SupabaseのAuth設定が有効か確認

## Supabaseマイグレーション詰まり
- `SQLSTATE 42710: type already exists` や `migration history mismatch` など
- `docs/runbooks/supabase-migrations-troubleshooting.md` を参照

## 暗号化エラー
- `TOKEN_ENCRYPTION_KEY` が32バイトか確認
- 変更した場合は既存トークンを再認可して再保存

## devサーバー起動失敗（ポート/ロック）
- `docs/runbooks/dev-server-port-lock.md` を参照して復旧する
