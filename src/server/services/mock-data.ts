import { ProviderType } from "@/server/providers/types";

export const mockOrganization = {
  id: "org-1",
  name: "TEPPEN デモ組織",
};

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
  [ProviderType.Meta]: false,
  [ProviderType.YahooPlace]: false,
  [ProviderType.AppleBusinessConnect]: false,
  [ProviderType.BingMaps]: true,
  [ProviderType.YahooYolp]: true,
};

export const mockReviews: Record<
  string,
  Array<{
    id: string;
    provider: ProviderType;
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
