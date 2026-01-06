import { ProviderError } from "@/server/providers/errors";
import {
  ProviderAdapter,
  ProviderType,
} from "@/server/providers/types";

const capabilities = {
  canConnectOAuth: true,
  canListLocations: false,
  canReadReviews: false,
  canReplyReviews: false,
  canCreatePosts: false,
  canReadInsights: false,
  canSearchPlaces: false,
};

export const yahooPlaceProvider: ProviderAdapter = {
  type: ProviderType.YahooPlace,
  displayName: "Yahoo!プレイス",
  capabilities,
  featureFlag: "YAHOO_PLACE_ENABLED",
  getAuthUrl: async () => {
    throw new ProviderError(
      ProviderType.YahooPlace,
      "not_supported",
      "Yahoo!プレイスはパートナー限定です。手順書を確認してください。"
    );
  },
};
