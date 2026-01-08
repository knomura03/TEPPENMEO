import { getEnv } from "@/server/utils/env";

const truthyValues = ["true", "1", "yes", "y", "on"];
const falsyValues = ["false", "0", "no", "n", "off"];

function parseEnvBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (truthyValues.includes(normalized)) return true;
  if (falsyValues.includes(normalized)) return false;
  return fallback;
}

export function isProviderMockMode(): boolean {
  return parseEnvBoolean(getEnv().PROVIDER_MOCK_MODE, true);
}

export function isMockMode(): boolean {
  return isProviderMockMode();
}

export function isYahooPlaceEnabled(): boolean {
  return parseEnvBoolean(getEnv().YAHOO_PLACE_ENABLED, false);
}

export function isAppleBusinessConnectEnabled(): boolean {
  return parseEnvBoolean(getEnv().APPLE_BUSINESS_CONNECT_ENABLED, false);
}
