import { ProviderType } from "@/server/providers/types";

export const mockOrganization = {
  id: "org-1",
  name: "TEPPEN デモ組織",
};

export const mockAdminUsers = [
  {
    id: "user-1",
    email: "admin@example.com",
    createdAt: new Date().toISOString(),
    lastSignInAt: new Date().toISOString(),
    isSystemAdmin: true,
    isDisabled: false,
  },
  {
    id: "user-2",
    email: "member@example.com",
    createdAt: new Date().toISOString(),
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

export const mockAuditLogs = [
  {
    id: "audit-1",
    action: "provider.connect",
    actorEmail: "admin@example.com",
    createdAt: new Date().toISOString(),
    metadata: { provider: ProviderType.GoogleBusinessProfile },
  },
];
