import { ProviderType } from "@/server/providers/types";
import type { JobRun } from "@/server/services/jobs/job-runs";

export const mockOrganization = {
  id: "org-1",
  name: "TEPPEN デモ組織",
};

export const mockAdminUsers = [
  {
    id: "user-1",
    email: "admin@example.com",
    createdAt: new Date().toISOString(),
    invitedAt: null,
    lastSignInAt: new Date().toISOString(),
    isSystemAdmin: true,
    isDisabled: false,
  },
  {
    id: "user-2",
    email: "member@example.com",
    createdAt: new Date().toISOString(),
    invitedAt: new Date().toISOString(),
    lastSignInAt: null,
    isSystemAdmin: false,
    isDisabled: false,
  },
];

export const mockMemberships = [
  {
    organizationId: mockOrganization.id,
    userId: "user-1",
    role: "owner",
  },
  {
    organizationId: mockOrganization.id,
    userId: "user-2",
    role: "member",
  },
];

export const mockLocations = [
  {
    id: "loc-1",
    organizationId: mockOrganization.id,
    name: "TEPPEN 渋谷",
    address: "東京都渋谷区渋谷1-2-3",
    city: "渋谷区",
    region: "東京都",
    postalCode: "150-0002",
    country: "JP",
    latitude: 35.6595,
    longitude: 139.7005,
  },
  {
    id: "loc-2",
    organizationId: mockOrganization.id,
    name: "TEPPEN 大阪",
    address: "大阪府大阪市浪速区難波4-5-6",
    city: "大阪市",
    region: "大阪府",
    postalCode: "542-0076",
    country: "JP",
    latitude: 34.6687,
    longitude: 135.5018,
  },
];

export const mockProviderConnections: Record<ProviderType, boolean> = {
  [ProviderType.GoogleBusinessProfile]: true,
  [ProviderType.Meta]: true,
  [ProviderType.YahooPlace]: false,
  [ProviderType.AppleBusinessConnect]: false,
  [ProviderType.BingMaps]: true,
  [ProviderType.YahooYolp]: true,
};

export const mockLocationProviderLinks = [
  {
    id: "link-1",
    locationId: "loc-1",
    provider: ProviderType.GoogleBusinessProfile,
    externalLocationId: "accounts/123/locations/456",
    metadata: {
      account_name: "TEPPEN デモアカウント",
      location_name: "TEPPEN 渋谷",
      last_review_sync_at: new Date().toISOString(),
    },
  },
];

export const mockReviews: Record<
  string,
  Array<{
    id: string;
    provider: ProviderType;
    externalReviewId: string;
    locationId: string;
    rating: number;
    author: string;
    comment: string;
    createdAt: string;
  }>
> = {
  "loc-1": [
    {
      id: "review-1",
      provider: ProviderType.GoogleBusinessProfile,
      externalReviewId: "review-1",
      locationId: "loc-1",
      rating: 5,
      author: "空",
      comment: "対応が早くて助かりました。",
      createdAt: new Date().toISOString(),
    },
  ],
};

export const mockPosts = [
  {
    id: "post-1",
    content: "今週限定で10%オフキャンペーンを実施中です。",
    status: "published",
    providers: [ProviderType.GoogleBusinessProfile],
    createdAt: new Date().toISOString(),
  },
];

export const mockPostHistory = [
  {
    id: "post-1",
    locationId: "loc-1",
    content: "今週限定で10%オフキャンペーンを実施中です。",
    status: "published",
    createdAt: new Date().toISOString(),
    media: ["/fixtures/mock-upload.png"],
    targets: [
      {
        provider: ProviderType.Meta,
        status: "published",
        error: null,
        externalPostId: "facebook:mock",
      },
    ],
  },
  {
    id: "post-2",
    locationId: "loc-1",
    content: "新メニューの写真を投稿しました。",
    status: "failed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    media: ["storage://mock/org/mock/loc/loc-1/mock.png"],
    targets: [
      {
        provider: ProviderType.Meta,
        status: "failed",
        error: "権限が不足しています。",
        externalPostId: "instagram:failed",
      },
    ],
  },
  {
    id: "post-3",
    locationId: "loc-1",
    content: "期間限定メニューの予約が始まりました。",
    status: "queued",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    media: [],
    targets: [
      {
        provider: ProviderType.Meta,
        status: "queued",
        error: null,
        externalPostId: "facebook:pending",
      },
      {
        provider: ProviderType.Meta,
        status: "queued",
        error: null,
        externalPostId: "instagram:pending",
      },
    ],
  },
  {
    id: "post-4",
    locationId: "loc-1",
    content: "Google投稿のテスト更新です。",
    status: "published",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    media: [],
    targets: [
      {
        provider: ProviderType.GoogleBusinessProfile,
        status: "published",
        error: null,
        externalPostId: "google:mock",
      },
    ],
  },
  {
    id: "post-5",
    locationId: "loc-1",
    content: "スタッフ紹介の投稿が失敗しました。",
    status: "failed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    media: ["/fixtures/mock-upload.png"],
    targets: [
      {
        provider: ProviderType.Meta,
        status: "failed",
        error: "再認可が必要です。",
        externalPostId: "facebook:failed",
      },
    ],
  },
  {
    id: "post-6",
    locationId: "loc-1",
    content: "週末イベントの告知を投稿しました。",
    status: "published",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    media: ["/fixtures/mock-upload.png"],
    targets: [
      {
        provider: ProviderType.Meta,
        status: "published",
        error: null,
        externalPostId: "instagram:mock",
      },
    ],
  },
  {
    id: "post-7",
    locationId: "loc-1",
    content: "営業時間変更のお知らせ（送信中）。",
    status: "queued",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    media: [],
    targets: [
      {
        provider: ProviderType.Meta,
        status: "queued",
        error: null,
        externalPostId: "facebook:pending",
      },
    ],
  },
  {
    id: "post-8",
    locationId: "loc-2",
    content: "大阪店の新メニューを紹介しました。",
    status: "published",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    media: ["/fixtures/mock-upload.png"],
    targets: [
      {
        provider: ProviderType.Meta,
        status: "published",
        error: null,
        externalPostId: "facebook:mock",
      },
    ],
  },
  {
    id: "post-9",
    locationId: "loc-2",
    content: "大阪店の投稿が権限不足で失敗しました。",
    status: "failed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    media: ["storage://mock/org/mock/loc/loc-2/mock.png"],
    targets: [
      {
        provider: ProviderType.Meta,
        status: "failed",
        error: "権限が不足しています。",
        externalPostId: "instagram:failed",
      },
    ],
  },
];

export const mockAuditLogs = [
  {
    id: "audit-1",
    action: "provider.connect",
    actorUserId: "user-1",
    actorEmail: "admin@example.com",
    organizationId: mockOrganization.id,
    organizationName: mockOrganization.name,
    targetType: "provider",
    targetId: ProviderType.GoogleBusinessProfile,
    createdAt: new Date().toISOString(),
    metadata: { provider: ProviderType.GoogleBusinessProfile },
  },
  {
    id: "audit-2",
    action: "reviews.sync_failed",
    actorUserId: "user-1",
    actorEmail: "admin@example.com",
    organizationId: mockOrganization.id,
    organizationName: mockOrganization.name,
    targetType: "location",
    targetId: "loc-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    metadata: {
      provider: ProviderType.GoogleBusinessProfile,
      error: "API承認が必要です。",
    },
  },
  {
    id: "audit-3",
    action: "admin.user.disable",
    actorUserId: "user-1",
    actorEmail: "admin@example.com",
    organizationId: null,
    organizationName: null,
    targetType: "user",
    targetId: "user-2",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    metadata: { reason: "運用上の都合" },
  },
];

export const mockJobRuns: JobRun[] = [
  {
    id: "job-1",
    organizationId: mockOrganization.id,
    jobKey: "gbp_reviews_bulk_sync",
    status: "succeeded",
    startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    finishedAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    summary: {
      totalLocations: 1,
      successCount: 1,
      failedCount: 0,
      reviewCount: 1,
      mockMode: true,
    },
    error: {},
    actorUserId: "user-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    organizationName: mockOrganization.name,
  },
];
