import { envBool, getEnv } from "@/server/utils/env";

export function isMockMode(): boolean {
  return envBool(getEnv().PROVIDER_MOCK_MODE, true);
}

export function isYahooPlaceEnabled(): boolean {
  return envBool(getEnv().YAHOO_PLACE_ENABLED, false);
}

export function isAppleBusinessConnectEnabled(): boolean {
  return envBool(getEnv().APPLE_BUSINESS_CONNECT_ENABLED, false);
}
