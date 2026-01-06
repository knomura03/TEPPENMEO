import { ProviderError } from "@/server/providers/errors";
import {
  ProviderAdapter,
  ProviderType,
} from "@/server/providers/types";

const capabilities = {
  canConnectOAuth: false,
  canListLocations: false,
  canReadReviews: false,
  canReplyReviews: false,
  canCreatePosts: false,
  canReadInsights: false,
  canSearchPlaces: false,
};

export const appleBusinessConnectProvider: ProviderAdapter = {
  type: ProviderType.AppleBusinessConnect,
  displayName: "Apple Business Connect",
  capabilities,
  featureFlag: "APPLE_BUSINESS_CONNECT_ENABLED",
  getAuthUrl: async () => {
    throw new ProviderError(
      ProviderType.AppleBusinessConnect,
      "not_supported",
      "Apple Business ConnectのAPIはパートナー限定です。"
    );
  },
};
