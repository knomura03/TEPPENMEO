import { httpRequestJson } from "@/server/utils/http";
import { getEnv } from "@/server/utils/env";
import { isMockMode } from "@/server/utils/feature-flags";
import { ProviderError } from "@/server/providers/errors";
import {
  ProviderAdapter,
  ProviderSearchInput,
  ProviderSearchResult,
  ProviderType,
} from "@/server/providers/types";

type YolpFeature = {
  Id: string;
  Name: string;
  Geometry?: {
    Coordinates?: string;
  };
  Property?: {
    Address?: string;
  };
};

type YolpResponse = {
  Feature?: YolpFeature[];
};

const capabilities = {
  canConnectOAuth: false,
  canListLocations: false,
  canReadReviews: false,
  canReplyReviews: false,
  canCreatePosts: false,
  canReadInsights: false,
  canSearchPlaces: true,
};

function parseCoordinates(raw?: string): { lat?: number; lng?: number } {
  if (!raw) return {};
  const [lngRaw, latRaw] = raw.split(",");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return {};
  return { lat, lng };
}

async function searchPlaces(
  input: ProviderSearchInput
): Promise<ProviderSearchResult[]> {
  if (isMockMode()) {
    return [
      {
        id: "yolp-1",
        name: "モックラーメン",
        address: "東京都目黒区中目黒4-4-4",
        lat: 35.6443,
        lng: 139.699,
      },
    ];
  }

  const env = getEnv();
  if (!env.YAHOO_YOLP_APP_ID) {
    throw new ProviderError(
      ProviderType.YahooYolp,
      "not_configured",
      "Yahoo! YOLPのApp IDが未設定です"
    );
  }

  const url = new URL("https://map.yahooapis.jp/search/local/V1/localSearch");
  url.searchParams.set("appid", env.YAHOO_YOLP_APP_ID);
  url.searchParams.set("query", input.query);
  url.searchParams.set("output", "json");
  url.searchParams.set("results", String(input.limit ?? 5));

  const data = await httpRequestJson<YolpResponse>(url.toString());
  const features = data.Feature ?? [];

  return features.map((feature) => {
    const coords = parseCoordinates(feature.Geometry?.Coordinates);
    return {
      id: feature.Id,
      name: feature.Name,
      address: feature.Property?.Address,
      lat: coords.lat,
      lng: coords.lng,
      raw: feature,
    };
  });
}

export const yahooYolpProvider: ProviderAdapter = {
  type: ProviderType.YahooYolp,
  displayName: "Yahoo! YOLP",
  capabilities,
  requiredEnv: ["YAHOO_YOLP_APP_ID"],
  searchPlaces,
};
