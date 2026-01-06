# GitHub PR作成/Push 失敗時の切り分け

## 目的
- push/PR作成が失敗したときの最短復旧手順を固定する
- SSH/gh auth の状態を確認し、原因別に対処できるようにする

## 前提
- ローカル設定に依存するため、環境差分が出る
- 権限不足やリポジトリアクセスはGitHub側の設定が必要
- このリポジトリはSSHでのpushを前提とする

## 1. まず確認すること
- [ ] `git status` で作業中ブランチと変更状態を確認
- [ ] `git remote -v` で `origin` がSSH形式か確認
  - 期待値: `git@github.com:<owner>/<repo>.git`
- [ ] `gh auth status` でログイン状態を確認

## 2. よくある失敗と対処

### A. pushが失敗する（権限/認証）
1) SSH疎通を確認  
   - `ssh -T git@github.com`
2) 失敗する場合  
   - SSH鍵を追加/再登録  
   - GitHubに公開鍵が登録済みか確認
3) `origin` がHTTPSになっている場合  
   - `git remote set-url origin git@github.com:<owner>/<repo>.git`

### B. gh pr create が失敗する
1) `gh auth status` を確認  
2) 未ログインなら  
   - `gh auth login`  
   - Git操作は **SSH** を選択
3) それでも失敗する場合  
   - GitHubの権限（repo/write/PR作成権限）を確認
   - Web UIでPRを作成し、後でgh環境を整備する

### C. ブランチがpushできない（保護ルール）
- mainへの直接pushは禁止  
- PRブランチへpushし、PR経由でマージする

## 3. 復旧後のチェック
- [ ] `git status` でクリーンな状態を確認
- [ ] `git push -u origin <branch>` を再実行
- [ ] `gh pr create` を再実行
