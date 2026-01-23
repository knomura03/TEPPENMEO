# プロバイダAPI契約書（証跡）

このドキュメントは、外部APIの実装が公式仕様に準拠していることを示すための証跡です。
「実装関数」「HTTP」「必須フィールド」「公式URL」を固定し、contract testで回帰を防ぎます。

## Google Business Profile（GBP）

| 機能 | 実装関数（ファイル/関数） | HTTP method + URL | 必須スコープ | 必須フィールド（最小） | 失敗しやすい条件 / 次にやること | 公式URL |
| --- | --- | --- | --- | --- | --- | --- |
| 投稿作成 | `src/server/providers/google_gbp/api.ts:createGooglePost` | POST `https://mybusiness.googleapis.com/v4/{locationName}/localPosts` | `https://www.googleapis.com/auth/business.manage` | `languageCode`, `summary`, `topicType`, `media[].sourceUrl`（画像時） | API承認不足/権限不足 → 申請/権限確認後に再接続。画像URL不可達 → 署名URLやURLの到達性を確認。 | https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/create / https://developers.google.com/my-business/content/posts-data |
| レビュー返信 | `src/server/providers/google_gbp/api.ts:replyGoogleReview` | PUT `https://mybusiness.googleapis.com/v4/{locationName}/reviews/{reviewId}/reply` | `https://www.googleapis.com/auth/business.manage` | `comment` | API未承認/再認可 → 再接続。レビューID不一致 → 取得済みレビューを再確認。 | https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/reply |

## Meta（Facebook Pages / Instagram Graph）

| 機能 | 実装関数（ファイル/関数） | HTTP method + URL | 必須permission | 必須フィールド（最小） | 失敗しやすい条件 / 次にやること | 公式URL |
| --- | --- | --- | --- | --- | --- | --- |
| Facebookページ投稿（テキスト） | `src/server/providers/meta/api.ts:publishFacebookPost` | POST `https://graph.facebook.com/v20.0/{page-id}/feed` | `pages_manage_posts` | `message`, `access_token` | App Review未完了/権限不足 → 権限追加と再認可。ページの権限不足 → 管理権限を確認。 | https://developers.facebook.com/docs/pages-api/posts/ / https://developers.facebook.com/docs/permissions/ |
| Facebookページ投稿（画像） | `src/server/providers/meta/api.ts:publishFacebookPost` | POST `https://graph.facebook.com/v20.0/{page-id}/photos` | `pages_manage_posts` | `url`, `caption`, `published`, `access_token` | 画像URL不可達 → 署名URL/URL到達性を確認。権限不足 → App Review/権限追加。 | https://developers.facebook.com/docs/pages-api/posts/ / https://developers.facebook.com/docs/permissions/ |
| Facebookコメント取得 | `src/server/providers/meta/api.ts:listFacebookComments` | GET `https://graph.facebook.com/v20.0/{page-id}/posts?fields=...comments{...}` | `pages_read_engagement` | `access_token` | 権限不足/ページ権限不足 → 権限追加と再認可。 | https://developers.facebook.com/docs/graph-api/reference/comment/ / https://developers.facebook.com/docs/permissions/ |
| Facebookコメント返信 | `src/server/providers/meta/api.ts:replyFacebookComment` | POST `https://graph.facebook.com/v20.0/{comment-id}/comments` | `pages_manage_posts`, `pages_manage_engagement` | `message`, `access_token` | 権限不足/審査待ち → App Review/再認可。 | https://developers.facebook.com/docs/graph-api/reference/comment/ / https://developers.facebook.com/docs/permissions/ |
| Instagram投稿 | `src/server/providers/meta/api.ts:publishInstagramPost`（内部で `createInstagramMedia` → `publishInstagramMedia`） | POST `https://graph.facebook.com/v20.0/{ig-user-id}/media` → POST `https://graph.facebook.com/v20.0/{ig-user-id}/media_publish` | `instagram_content_publish`, `instagram_basic`, `pages_show_list` | `image_url`, `access_token`（media作成） / `creation_id`, `access_token`（publish） | IGがプロアカウント未設定/ページ未連携 → 連携を確認。権限不足 → App Review/権限追加。 | https://developers.facebook.com/docs/instagram-platform/content-publishing/ / https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/ / https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish/ / https://developers.facebook.com/docs/permissions/ |
| Instagramコメント取得 | `src/server/providers/meta/api.ts:listInstagramComments` | GET `https://graph.facebook.com/v20.0/{ig-user-id}/media` → GET `https://graph.facebook.com/v20.0/{ig-media-id}/comments` | `instagram_manage_comments`, `pages_read_engagement` | `access_token` | IG連携未設定/権限不足 → 連携確認/権限追加。 | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/ / https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/comments/ / https://developers.facebook.com/docs/permissions/ |
| Instagramコメント返信 | `src/server/providers/meta/api.ts:replyInstagramComment` | POST `https://graph.facebook.com/v20.0/{ig-comment-id}/replies` | `instagram_manage_comments` | `message`, `access_token` | 権限不足/審査待ち → App Review/再認可。 | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment/replies/ / https://developers.facebook.com/docs/permissions/ |

## Contract test（回帰防止）
- `src/server/providers/google_gbp/api.contract.test.ts`
- `src/server/providers/meta/api.contract.test.ts`
