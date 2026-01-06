export enum ProviderType {
  GoogleBusinessProfile = "google_gbp",
  Meta = "meta",
  YahooPlace = "yahoo_place",
  AppleBusinessConnect = "apple_business_connect",
  BingMaps = "bing_maps",
  YahooYolp = "yahoo_yolp",
}

export type ProviderCapabilities = {
  canConnectOAuth: boolean;
  canListLocations: boolean;
  canReadReviews: boolean;
  canReplyReviews: boolean;
  canCreatePosts: boolean;
  canReadInsights: boolean;
  canSearchPlaces: boolean;
};

export type ProviderAuth = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
};

export type ProviderAccount = {
  provider: ProviderType;
  externalAccountId?: string | null;
  displayName?: string | null;
  auth?: ProviderAuth;
  metadata?: Record<string, unknown>;
};

export type ProviderLocation = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  metadata?: Record<string, unknown>;
};

export type ProviderReview = {
  id: string;
  rating: number;
  comment?: string | null;
  author?: string | null;
  createdAt: string;
};

export type ProviderPost = {
  id: string;
  content: string;
  mediaUrls?: string[];
  status: "queued" | "published" | "failed";
};

export type ProviderSearchResult = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  raw?: unknown;
};

export type ProviderAuthParams = {
  state: string;
  redirectUri?: string;
};

export type ProviderOAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
  externalAccountId?: string;
  displayName?: string;
  metadata?: Record<string, unknown>;
};

export type ProviderRequestContext = {
  organizationId: string;
  locationId?: string;
  account?: ProviderAccount;
};

export type ProviderCreatePostInput = {
  content: string;
  mediaUrls?: string[];
};

export type ProviderSearchInput = {
  query: string;
  limit?: number;
};

export interface ProviderAdapter {
  type: ProviderType;
  displayName: string;
  capabilities: ProviderCapabilities;
  requiredEnv?: string[];
  featureFlag?: string;

  getAuthUrl?: (params: ProviderAuthParams) => Promise<string>;
  handleOAuthCallback?: (params: {
    code: string;
    redirectUri?: string;
  }) => Promise<ProviderOAuthResult>;
  listLocations?: (context: ProviderRequestContext) => Promise<ProviderLocation[]>;
  listReviews?: (context: ProviderRequestContext) => Promise<ProviderReview[]>;
  replyReview?: (context: ProviderRequestContext, reviewId: string, reply: string) => Promise<void>;
  createPost?: (context: ProviderRequestContext, input: ProviderCreatePostInput) => Promise<ProviderPost>;
  searchPlaces?: (input: ProviderSearchInput) => Promise<ProviderSearchResult[]>;
}
