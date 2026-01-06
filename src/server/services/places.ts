import { getProvider } from "@/server/providers/registry";
import { ProviderError } from "@/server/providers/errors";
import { ProviderSearchResult, ProviderType } from "@/server/providers/types";

export async function searchPlaces(
  providerType: ProviderType,
  query: string,
  limit = 5
): Promise<ProviderSearchResult[]> {
  const provider = getProvider(providerType);
  if (!provider.searchPlaces) {
    throw new ProviderError(
      providerType,
      "not_supported",
      "このプロバイダでは検索に対応していません"
    );
  }

  return provider.searchPlaces({ query, limit });
}
