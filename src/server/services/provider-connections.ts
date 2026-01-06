import { ProviderType } from "@/server/providers/types";
import { mockProviderConnections } from "@/server/services/mock-data";
import { isSupabaseConfigured } from "@/server/utils/env";

export type ProviderConnection = {
  provider: ProviderType;
  connected: boolean;
};

export async function listProviderConnections(): Promise<ProviderConnection[]> {
  if (!isSupabaseConfigured()) {
    return Object.entries(mockProviderConnections).map(([provider, connected]) => ({
      provider: provider as ProviderType,
      connected,
    }));
  }

  return Object.entries(mockProviderConnections).map(([provider, connected]) => ({
    provider: provider as ProviderType,
    connected,
  }));
}
