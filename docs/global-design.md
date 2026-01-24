# グローバルデザイン指針

## 目的
- 実装のブレを抑え、可読性と運用速度を落とさない
- 画面の一貫性を保ち、最小の変更で最大の理解を得る
- AI実装時の“見た目の事故”を防ぐ

## デザイン方針
- 方向性: Utility & Function
  - 理由: 運用中心のプロダクトとして、情報密度と可読性を最優先にする
- デジタル庁デザインシステム準拠
  - 優先順: 可読性 > 一貫性 > 見た目の派手さ
  - 迷った場合は「公的サービスの読みやすさ」を基準にする

## タイポグラフィ
Do:
- 本文/主要UIは 16px 以上を基準にする
- 14px は「補助情報」「短いラベル」など例外用途に限定する
- 本文の行間は 1.5 以上を目安にする

Don't:
- 12px を常用しない
- 見出しと本文のサイズ差を 2px 以内にしない

## 余白（Spacing）
Do:
- 4px グリッドに統一する（4の倍数のみ使用）
- カード内余白は 16px 以上を基本とする
- カード間は 24px 以上を基本とする

Don't:
- 余白の値をページごとに変えない
- 8px 未満の余白を常用しない

## 色とコントラスト
Do:
- 通常テキストは 4.5:1 以上、見出しは 3:1 以上を目安にする
- 状態色は色だけで伝えず、ラベルや文言を併記する
- primary は `#001976` を基準とし、リンク/ボタン/強調色に使用する
- 色はトークン経由で指定する（例: `--text-default`, `--text-muted`, `--surface`, `--border`）

Don't:
- 背景と文字色が近い組み合わせを使わない
- 色だけで「成功/失敗」を表現しない
- 画面ごとに `text-slate-*` を乱用して色が揺れる状態にしない

## ボタン/リンク
Do:
- タップ領域は 44px 以上を目安にする
- 主/副/危険の3階層を使い分ける
- 主要導線はボタン風の見た目で統一する
- リンクは primary 色（#001976）を基本とする

Don't:
- 重要操作をテキストリンクのまま放置しない
- クリック領域が小さいボタンを増やさない

## コンポーネント運用ルール
Do:
- Card tone を必ず使う（light/dark/amber）
- Badge/Chip/Alert は意味ごとに統一する
- 空状態は「理由 + 次にやること」をセットで表示する
- フォームは FormField を基本にし、Input/Select/Textarea は共通コンポーネントを使う
- Button は variant/size を統一し、Link には buttonStyles を使う
- ロゴは `/logo.svg` を使用し、ヘッダーに表示する
- 画像は原則 `next/image` を使う（例外がある場合は理由をコメント）

Don't:
- 同一要素に背景/文字色の矛盾クラスを混在させない
- 表の行高や余白をページごとに変えない
- 独自のinputスタイルをページ単位で量産しない

## ブランドカラー（primary #001976）
Do:
- `var(--primary)` を参照し、直書きの色指定を避ける
- ボタン/リンク/ヘッダーの強調色は primary に統一する
- 背景/本文/枠線はトークンで統一する（例: `--background`, `--surface`, `--border`）

Don't:
- primary をページごとに別の色で代用しない

## フォーム/ボタン規約
Do:
- FormField を使い、label/hint/error を必ずセットで扱う
- error がある場合は aria-invalid を true にする
- Button は variant/size を指定し、md は 44px 以上を満たす
- 重要導線は Button を使い、Link には buttonStyles を使う
- 送信中は loading 表示、無効時は disabled 表示を統一する
- Input/Select/Textarea の背景/境界/文字色はトークンで統一する

Don't:
- ラベル無しの入力を置かない
- エラー表示を input の近くに出さない

## FilterBar運用
Do:
- 「適用」「リセット」は Button / buttonStyles に統一する
- FilterBar内の入力は FormField に寄せる
- 送信不可の理由は近くに短く表示する

Don't:
- ページごとに適用/リセットの文言や位置を変えない

## Table / Pagination
Do:
- Tableは semanticな <table> を使い、行高・余白を統一する
- ヘッダは `th` + `scope="col"` を必ず付与する
- 0件時は EmptyState を使い、「次にやること」を提示する
- Paginationはフィルタ条件を保持して遷移する（searchParamsを維持）
- 列順は「日時 → 対象 → 状態 → 操作/詳細」を基本形とし、重要度順に並べる
- 本文やmetadataは2行まで省略し、全文は「詳細」で表示する
- IDや日時は mono 表記で区別し、列幅は崩れないよう固定する

Don't:
- divテーブルでレイアウトしない
- 空状態の説明を省略しない

## 詳細展開（DetailsDisclosure）
Do:
- summaryは「詳細」に統一する
- 開いた中身はKey/Valueの一覧（dl）で並べる
- 長文やJSONは折り返し + 最大高さ + スクロールにする
- token/secret/password 等の機密キーは値を必ずマスクする

Don't:
- 画面ごとに summary 文言を変えない
- 色だけで状態を伝えない（Badge + 文言を併記）

## 文言（日本語UIコピー）
Do:
- 短く、次の行動が明確になる表現にする
- 例: 「同期する」「接続する」「再認可する」

Don't:
- 抽象的で次の行動が不明な文言にしない

## AIが壊しやすいポイント（チェックリスト）
- [ ] 背景色と文字色が衝突していないか
- [ ] 余白の単位が4pxグリッドから外れていないか
- [ ] ボタンの最小高さ 44px を満たしているか
- [ ] 色だけで状態を伝えていないか

## Playwright目視検証（必須スクショ）
- app-setup / app-reviews / admin主要

## 参考
- https://design.digital.go.jp/dads/foundations/typography/
- https://design.digital.go.jp/dads/foundations/color/accessibility/
- https://design.digital.go.jp/components/button/
- https://design.digital.go.jp/dads/foundations/spacing/
- https://github.com/Dammyjay93/claude-design-skill
