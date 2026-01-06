import { providers } from "@/server/providers/registry";
import { ProviderAdapter } from "@/server/providers/types";
import { getEnv } from "@/server/utils/env";
import {
  isAppleBusinessConnectEnabled,
  isMockMode,
  isYahooPlaceEnabled,
} from "@/server/utils/feature-flags";

export type ProviderStatus = {
  type: ProviderAdapter["type"];
  name: string;
  enabled: boolean;
  status: "enabled" | "disabled" | "not_configured" | "mocked";
  requiredEnv: string[];
  missingEnv: string[];
  capabilities: ProviderAdapter["capabilities"];
  featureFlag?: string;
};

function isProviderEnabled(adapter: ProviderAdapter): boolean {
  if (adapter.featureFlag === "YAHOO_PLACE_ENABLED") {
    return isYahooPlaceEnabled();
  }
  if (adapter.featureFlag === "APPLE_BUSINESS_CONNECT_ENABLED") {
    return isAppleBusinessConnectEnabled();
  }
  return true;
}

export function listProviderStatus(): ProviderStatus[] {
  const env = getEnv() as Record<string, string | undefined>;
  return providers.map((provider) => {
    const requiredEnv = provider.requiredEnv ?? [];
    const missingEnv = requiredEnv.filter((key) => !env[key]);
    const enabled = isProviderEnabled(provider);

    let status: ProviderStatus["status"] = "enabled";
    if (!enabled) {
      status = "disabled";
    } else if (missingEnv.length > 0) {
      status = "not_configured";
    } else if (isMockMode()) {
      status = "mocked";
    }

    return {
      type: provider.type,
      name: provider.displayName,
      enabled,
      status,
      requiredEnv,
      missingEnv,
      capabilities: provider.capabilities,
      featureFlag: provider.featureFlag,
    };
  });
}

export function getProviderByType(type: ProviderAdapter["type"]) {
  return providers.find((provider) => provider.type === type);
}
