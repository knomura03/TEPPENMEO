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

type BingLocation = {
  name: string;
  address: {
    formattedAddress: string;
  };
  point: {
    coordinates: [number, number];
  };
  entityId?: string;
};

type BingResponse = {
  resourceSets: Array<{
    resources: BingLocation[];
  }>;
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

async function searchPlaces(
  input: ProviderSearchInput
): Promise<ProviderSearchResult[]> {
  if (isMockMode()) {
    return [
      {
        id: "bing-1",
        name: "モック喫茶",
        address: "東京都中央区銀座2-2-2",
        lat: 35.6717,
        lng: 139.765,
      },
    ];
  }

  const env = getEnv();
  if (!env.BING_MAPS_KEY) {
    throw new ProviderError(
      ProviderType.BingMaps,
      "not_configured",
      "Bing MapsのAPIキーが未設定です"
    );
  }

  const url = new URL("https://dev.virtualearth.net/REST/v1/Locations");
  url.searchParams.set("q", input.query);
  url.searchParams.set("maxResults", String(input.limit ?? 5));
  url.searchParams.set("key", env.BING_MAPS_KEY);

  const data = await httpRequestJson<BingResponse>(url.toString());
  const resources = data.resourceSets?.[0]?.resources ?? [];

  return resources.map((resource) => ({
    id: resource.entityId ?? resource.name,
    name: resource.name,
    address: resource.address?.formattedAddress,
    lat: resource.point?.coordinates?.[0],
    lng: resource.point?.coordinates?.[1],
    raw: resource,
  }));
}

export const bingMapsProvider: ProviderAdapter = {
  type: ProviderType.BingMaps,
  displayName: "Bing Maps",
  capabilities,
  requiredEnv: ["BING_MAPS_KEY"],
  searchPlaces,
};
