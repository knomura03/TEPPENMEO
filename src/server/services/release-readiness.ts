import { getSessionUser } from "@/server/auth/session";
import { getPublicSiteMetadata } from "@/server/public-site/metadata";
import { ProviderType } from "@/server/providers/types";
import {
  checkAuditLogsIndexes,
  checkJobRunsRunningIndex,
  checkJobSchedulesSchema,
  checkJobRunsSchema,
  checkMediaAssetsSchema,
  checkSetupProgressSchema,
  checkSupabaseConnection,
  checkUserBlocksSchema,
  getEnvCheckGroups,
} from "@/server/services/diagnostics";
import { countEnabledJobSchedules } from "@/server/services/jobs/job-schedules";
import { getMediaConfig, isStorageConfigured } from "@/server/services/media";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { getProviderAccount } from "@/server/services/provider-accounts";
import { listProviderConnections } from "@/server/services/provider-connections";
import { resolvePermissionDiff } from "@/server/services/provider-permissions";

export async function getReleaseReadiness() {
  function normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string") {
      return value.split(/[\s,]+/).filter(Boolean);
    }
    return [];
  }

  const { mockRequired, realRequired, envError, providerMockMode } =
    getEnvCheckGroups();
  const appBaseUrlSet = Boolean(process.env.APP_BASE_URL);
  const publicMetadata = getPublicSiteMetadata();
  const publicInfoSet =
    Boolean(publicMetadata.operatorName) && Boolean(publicMetadata.contactEmail);

  const supabase = await checkSupabaseConnection();
  const userBlocksSchema = await checkUserBlocksSchema();
  const setupProgressSchema = await checkSetupProgressSchema();
  const mediaAssetsSchema = await checkMediaAssetsSchema();
  const jobRunsSchema = await checkJobRunsSchema();
  const jobSchedulesSchema = await checkJobSchedulesSchema();
  const jobRunsRunningIndex = await checkJobRunsRunningIndex();
  const auditLogsIndexes = await checkAuditLogsIndexes();

  const mediaConfig = getMediaConfig();
  const storageReady = isStorageConfigured();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET);
  const autoSyncCount = await countEnabledJobSchedules({
    jobKey: "gbp_reviews_bulk_sync",
  });

  const user = await getSessionUser();
  const org = user ? await getPrimaryOrganization(user.id) : null;
  const connections = org ? await listProviderConnections(org.id, user?.id) : [];
  const googleAccount = org
    ? await getProviderAccount(org.id, ProviderType.GoogleBusinessProfile)
    : null;
  const metaAccount = org ? await getProviderAccount(org.id, ProviderType.Meta) : null;

  const connectionStatus = {
    google: org
      ? connections.find((c) => c.provider === ProviderType.GoogleBusinessProfile)
          ?.status ?? "not_connected"
      : "unknown",
    meta: org
      ? connections.find((c) => c.provider === ProviderType.Meta)?.status ??
        "not_connected"
      : "unknown",
  };

  const googlePermissionDiff = resolvePermissionDiff({
    required: ["https://www.googleapis.com/auth/business.manage"],
    requested:
      normalizeStringArray(googleAccount?.metadata?.requested_scopes) ??
      normalizeStringArray(googleAccount?.scopes),
    granted: normalizeStringArray(googleAccount?.scopes),
    normalize: (scope) => scope.replace("https://www.googleapis.com/auth/", ""),
  });
  const metaPermissionDiff = resolvePermissionDiff({
    required: [
      "pages_show_list",
      "pages_manage_posts",
      "pages_read_engagement",
      "instagram_basic",
      "instagram_content_publish",
    ],
    requested:
      normalizeStringArray(metaAccount?.metadata?.requested_permissions) ??
      normalizeStringArray(metaAccount?.metadata?.permissions_granted),
    granted:
      normalizeStringArray(metaAccount?.metadata?.permissions_granted) ??
      normalizeStringArray(metaAccount?.scopes),
  });

  return {
    env: {
      mockRequired,
      realRequired,
      envError,
      providerMockMode,
      appBaseUrlSet,
      publicInfoSet,
    },
    supabase: {
      connection: supabase.ok,
      message: supabase.message,
      migrations: {
        userBlocks: userBlocksSchema.status,
        setupProgress: setupProgressSchema.status,
        mediaAssets: mediaAssetsSchema.status,
        jobRuns: jobRunsSchema.status,
        jobSchedules: jobSchedulesSchema.status,
        jobRunsRunningIndex: jobRunsRunningIndex.status,
        auditLogsIndexes: auditLogsIndexes.status,
      },
    },
    storage: {
      bucket: Boolean(mediaConfig.bucket),
      serviceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ready: storageReady,
      signedUrlTtlSeconds: mediaConfig.signedUrlTtlSeconds,
      maxUploadMb: mediaConfig.maxUploadMb,
    },
    cron: {
      cronSecretConfigured,
      autoSyncCount: autoSyncCount.count,
      autoSyncReason: autoSyncCount.reason,
    },
    providers: {
      connectionStatus,
      googlePermissionDiff,
      metaPermissionDiff,
    },
    orgName: org?.name ?? null,
  };
}
