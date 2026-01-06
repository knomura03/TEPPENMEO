import { appleBusinessConnectProvider } from "@/server/providers/apple_business_connect";
import { bingMapsProvider } from "@/server/providers/bing_maps";
import { googleBusinessProfileProvider } from "@/server/providers/google_gbp";
import { metaProvider } from "@/server/providers/meta";
import { yahooPlaceProvider } from "@/server/providers/yahoo_place";
import { yahooYolpProvider } from "@/server/providers/yahoo_yolp";
import { ProviderAdapter, ProviderType } from "@/server/providers/types";

const registry: Record<ProviderType, ProviderAdapter> = {
  [ProviderType.GoogleBusinessProfile]: googleBusinessProfileProvider,
  [ProviderType.Meta]: metaProvider,
  [ProviderType.YahooPlace]: yahooPlaceProvider,
  [ProviderType.AppleBusinessConnect]: appleBusinessConnectProvider,
  [ProviderType.BingMaps]: bingMapsProvider,
  [ProviderType.YahooYolp]: yahooYolpProvider,
};

export const providers = Object.values(registry);

export function getProvider(type: ProviderType): ProviderAdapter {
  return registry[type];
}
