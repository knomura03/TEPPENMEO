import { ProviderError, toProviderError } from "@/server/providers/errors";
import { ProviderType } from "@/server/providers/types";
import { listGoogleLocationCandidates } from "@/server/services/google-business-profile";
import { listMetaPageCandidates } from "@/server/services/meta";
import { listLocations } from "@/server/services/locations";
import { listLocationProviderLinks } from "@/server/services/location-provider-links";
import { resolvePermissionDiff } from "@/server/services/provider-permissions";
import { writeAuditLog } from "@/server/services/audit-logs";
import { getProviderAccount } from "@/server/services/provider-accounts";
import { getEnv, type Env } from "@/server/utils/env";
import { isMockMode } from "@/server/utils/feature-flags";

export type ProviderHealthStatus =
  | "ok"
  | "warning"
  | "error"
  | "not_configured"
  | "not_connected";

export type ProviderHealthCheck = {
  name: string;
  ok: boolean;
  summary: string;
};

export type ProviderHealthBlockedReason = {
  cause: string;
  nextActions: string[];
};

export type ProviderHealthResult = {
  status: ProviderHealthStatus;
  checks: ProviderHealthCheck[];
  nextActions: string[];
  debug: {
    httpStatus?: number;
  };
  apiCallEnabled: boolean;
  blockedReason?: ProviderHealthBlockedReason | null;
};

type EnvCheck = {
  ok: boolean;
  summary: string;
  missingKeys: string[];
};

type ErrorHint = {
  status: ProviderHealthStatus;
  summary: string;
  nextActions: string[];
  reason: string;
};

type ListCandidates = (params: {
  organizationId: string;
  actorUserId?: string | null;
}) => Promise<Array<unknown>>;

type HealthOutcome = {
  result: ProviderHealthResult;
  reason: string;
  httpStatus?: number;
};

const googleEnvKeys: readonly (keyof Env)[] = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
] as const;

const metaEnvKeys: readonly (keyof Env)[] = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_REDIRECT_URI",
] as const;

const metaCommentPermissions = [
  "pages_read_engagement",
  "pages_manage_engagement",
  "instagram_basic",
  "instagram_manage_comments",
];

const providerLabels: Record<ProviderType, string> = {
  [ProviderType.GoogleBusinessProfile]: "Google",
  [ProviderType.Meta]: "Meta",
  [ProviderType.YahooPlace]: "Yahoo!プレイス",
  [ProviderType.AppleBusinessConnect]: "Apple Business Connect",
  [ProviderType.BingMaps]: "Bing Maps",
  [ProviderType.YahooYolp]: "Yahoo! YOLP",
};

function resolveEnvCheck(requiredKeys: readonly (keyof Env)[]): EnvCheck {
  try {
    const env = getEnv();
    const missingKeys = requiredKeys.filter((key) => !env[key]);
    if (missingKeys.length === 0) {
      return { ok: true, summary: "設定済み", missingKeys: [] };
    }
    return {
      ok: false,
      summary: `未設定: ${missingKeys.join(", ")}`,
      missingKeys,
    };
  } catch (error) {
    return {
      ok: false,
      summary:
        error instanceof Error
          ? error.message
          : "環境変数の検証に失敗しました。",
      missingKeys: [...requiredKeys],
    };
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return value.split(/[\s,]+/).filter(Boolean);
  }
  return [];
}

function mergeNextActions(base: string[], extra: string[]) {
  return Array.from(new Set([...base, ...extra]));
}

function buildEnvCheckResult(check: EnvCheck): ProviderHealthCheck {
  return {
    name: "環境変数",
    ok: check.ok,
    summary: check.summary,
  };
}

function buildConnectionCheck(ok: boolean): ProviderHealthCheck {
  return {
    name: "接続状態",
    ok,
    summary: ok ? "接続済み" : "未接続",
  };
}

function buildApiCheck(ok: boolean, summary: string): ProviderHealthCheck {
  return {
    name: "読み取りAPI",
    ok,
    summary,
  };
}

function buildMockResult(provider: ProviderType): ProviderHealthResult {
  const label = providerLabels[provider];
  const blockedReason = {
    cause: "モック運用のため外部APIは実行しません。",
    nextActions: [
      "実APIの確認にはPROVIDER_MOCK_MODEをfalseにしてください。",
    ],
  };
  return {
    status: "warning",
    checks: [
      {
        name: "モックモード",
        ok: true,
        summary: `${label}の外部APIは実行していません。`,
      },
      {
        name: "接続状態",
        ok: true,
        summary: "モック接続",
      },
      {
        name: "読み取りAPI",
        ok: true,
        summary: "モック応答",
      },
    ],
    nextActions: blockedReason.nextActions,
    debug: {},
    apiCallEnabled: false,
    blockedReason,
  };
}

function buildBlockedResult(params: {
  provider: ProviderType;
  envCheck: EnvCheck;
  hasToken: boolean;
  blockedReason: ProviderHealthBlockedReason;
  status: ProviderHealthStatus;
  apiSummary: string;
  reason: string;
}): { result: ProviderHealthResult; reason: string } {
  const checks = [
    buildEnvCheckResult(params.envCheck),
    buildConnectionCheck(params.hasToken),
    buildApiCheck(false, params.apiSummary),
  ];
  const nextActions = mergeNextActions(
    params.blockedReason.nextActions,
    params.envCheck.ok
      ? []
      : [`${providerLabels[params.provider]}の環境変数を設定してください。`]
  );
  return {
    result: {
      status: params.status,
      checks,
      nextActions,
      debug: {},
      apiCallEnabled: false,
      blockedReason: params.blockedReason,
    },
    reason: params.reason,
  };
}

function buildNotConnectedResult(
  provider: ProviderType,
  envCheck: EnvCheck
): { result: ProviderHealthResult; reason: string } {
  const label = providerLabels[provider];
  const status: ProviderHealthStatus = envCheck.ok
    ? "not_connected"
    : "not_configured";
  return buildBlockedResult({
    provider,
    envCheck,
    hasToken: false,
    blockedReason: {
      cause: `${label}の接続が未完了です。`,
      nextActions: [`${label}の接続を開始してください。`],
    },
    status,
    apiSummary: "未実行（未接続）",
    reason: status,
  });
}

function buildSuccessResult(params: {
  provider: ProviderType;
  envCheck: EnvCheck;
  checks: ProviderHealthCheck[];
  listLabel: string;
  itemCount: number;
}): HealthOutcome {
  const checks = [
    ...params.checks,
    buildApiCheck(true, `${params.listLabel}${params.itemCount}件を取得`),
  ];
  const status = resolveStatusFromChecks(checks);
  const nextActions = params.envCheck.ok
    ? []
    : [`${providerLabels[params.provider]}の環境変数を設定してください。`];
  return {
    result: {
      status,
      checks,
      nextActions,
      debug: {},
      apiCallEnabled: true,
      blockedReason: null,
    },
    reason: status === "ok" ? "ok" : "env_missing",
  };
}

type MetaCommentReadiness = {
  ok: boolean;
  summary: string;
  nextActions: string[];
  cause?: string;
};

async function resolveMetaCommentReadiness(params: {
  organizationId: string;
  accountMetadata?: Record<string, unknown> | null;
}): Promise<MetaCommentReadiness> {
  const locations = await listLocations(params.organizationId);
  if (locations.length === 0) {
    return {
      ok: false,
      summary: "未準備（店舗が未登録）",
      cause: "店舗が未登録のためコメントを取得できません。",
      nextActions: ["店舗を追加してください。"],
    };
  }

  const locationIds = locations.map((location) => location.id);
  const links = await listLocationProviderLinks({
    locationIds,
    provider: ProviderType.Meta,
  });

  if (links.length === 0) {
    return {
      ok: false,
      summary: "未準備（Facebookページ未紐付け）",
      cause: "店舗とFacebookページの紐付けが必要です。",
      nextActions: ["店舗詳細でFacebookページを紐付けてください。"],
    };
  }

  const granted = normalizeStringArray(
    params.accountMetadata?.permissions_granted
  );
  const requested = normalizeStringArray(
    params.accountMetadata?.requested_permissions
  );
  const diff = resolvePermissionDiff({
    required: metaCommentPermissions,
    requested,
    granted,
  });

  if (diff.state === "missing") {
    return {
      ok: false,
      summary: `権限不足: ${diff.missing.join(", ")}`,
      cause: `コメント取得に必要な権限が不足しています: ${diff.missing.join(", ")}`,
      nextActions: [
        "Metaで必要な権限を追加し、連携サービスを再接続してください。",
      ],
    };
  }
  if (diff.state === "requested") {
    return {
      ok: false,
      summary: "権限の付与状況が未確認",
      cause: "権限は要求済みですが、付与状況が不明です。",
      nextActions: [
        "Metaで権限の付与状況を確認し、必要なら再接続してください。",
      ],
    };
  }
  if (diff.state === "unknown") {
    return {
      ok: false,
      summary: "権限の保存情報が不足",
      cause: "権限の取得状況を保存していません。",
      nextActions: ["再接続して権限情報を取得してください。"],
    };
  }

  const instagramLinked = links.some((link) =>
    Boolean(
      link.metadata?.instagram_business_account_id ??
        link.metadata?.instagram_id
    )
  );
  if (!instagramLinked) {
    return {
      ok: false,
      summary: "Instagramコメントは未準備",
      cause: "Instagramコメントの取得にはInstagram連携が必要です。",
      nextActions: ["店舗詳細でInstagram連携を確認してください。"],
    };
  }

  return {
    ok: true,
    summary: "準備完了",
    nextActions: [],
  };
}

function applyMetaCommentReadiness(
  result: ProviderHealthResult,
  readiness: MetaCommentReadiness
): ProviderHealthResult {
  const apiCheckFailed = result.checks.some(
    (check) => check.name === "読み取りAPI" && !check.ok
  );
  const checks = [
    ...result.checks,
    {
      name: "コメント取得準備",
      ok: readiness.ok,
      summary: readiness.summary,
    },
  ];
  const nextActions = mergeNextActions(result.nextActions, readiness.nextActions);
  const status =
    readiness.ok || result.status !== "ok" ? result.status : "warning";
  const blockedReason =
    !readiness.ok && !result.blockedReason && !apiCheckFailed && readiness.cause
      ? { cause: readiness.cause, nextActions: readiness.nextActions }
      : result.blockedReason;

  return {
    ...result,
    status,
    checks,
    nextActions,
    blockedReason,
  };
}

function buildErrorResult(params: {
  provider: ProviderType;
  envCheck: EnvCheck;
  checks: ProviderHealthCheck[];
  error: ProviderError;
}): HealthOutcome {
  const hint = resolveErrorHint(params.provider, params.error);
  const checks = [...params.checks, buildApiCheck(false, hint.summary)];
  const nextActions = mergeNextActions(
    hint.nextActions,
    params.envCheck.ok
      ? []
      : [`${providerLabels[params.provider]}の環境変数を設定してください。`]
  );
  return {
    result: {
      status: hint.status,
      checks,
      nextActions,
      debug: { httpStatus: params.error.status },
      apiCallEnabled: true,
      blockedReason: null,
    },
    reason: hint.reason,
    httpStatus: params.error.status,
  };
}

function resolveErrorHint(provider: ProviderType, error: ProviderError): ErrorHint {
  const status: ProviderHealthStatus =
    error.code === "not_configured"
      ? "not_configured"
      : error.code === "auth_required" || error.code === "rate_limited"
        ? "warning"
        : "error";
  const summary = error.message;
  const nextActions: string[] = [];

  if (provider === ProviderType.GoogleBusinessProfile) {
    if (error.code === "auth_required") {
      nextActions.push("Googleの再認可を実行してください。");
      if (error.status === 403 || summary.includes("API承認")) {
        nextActions.push(
          "Google Business ProfileのAPI承認と権限設定を確認してください。"
        );
      }
    }
    if (error.code === "rate_limited") {
      nextActions.push("時間をおいて再実行してください。");
    }
    if (error.code === "validation_error") {
      nextActions.push("ロケーション紐付けや設定を確認してください。");
    }
    if (error.code === "not_configured") {
      nextActions.push("Googleの環境変数を設定してください。");
    }
  }

  if (provider === ProviderType.Meta) {
    if (error.code === "auth_required") {
      nextActions.push("Metaの再認可を実行してください。");
      nextActions.push("App Reviewと権限承認の状況を確認してください。");
      nextActions.push("Facebookページのタスク権限を確認してください。");
    }
    if (error.code === "rate_limited") {
      nextActions.push("時間をおいて再実行してください。");
    }
    if (error.code === "validation_error") {
      nextActions.push("ページ紐付けや権限設定を確認してください。");
    }
    if (error.code === "not_configured") {
      nextActions.push("Metaの環境変数を設定してください。");
    }
  }

  if (nextActions.length === 0) {
    nextActions.push("時間をおいて再実行してください。");
  }

  return {
    status,
    summary,
    nextActions,
    reason: error.code,
  };
}

export function resolveProviderErrorHint(
  provider: ProviderType,
  error: ProviderError
): ErrorHint {
  return resolveErrorHint(provider, error);
}

async function writeHealthAuditLog(params: {
  actorUserId?: string | null;
  organizationId: string;
  provider: ProviderType;
  status: ProviderHealthStatus;
  reason: string;
  httpStatus?: number;
}) {
  await writeAuditLog({
    actorUserId: params.actorUserId ?? null,
    organizationId: params.organizationId,
    action:
      params.status === "ok"
        ? "provider.health_check"
        : "provider.health_check_failed",
    targetType: "provider",
    targetId: params.provider,
    metadata: {
      provider_type: params.provider,
      status: params.status,
      reason: params.reason,
      http_status: params.httpStatus ?? null,
    },
  });
}

async function finalizeHealthResult(params: {
  actorUserId?: string | null;
  organizationId: string;
  provider: ProviderType;
  result: ProviderHealthResult;
  reason: string;
  httpStatus?: number;
}) {
  await writeHealthAuditLog({
    actorUserId: params.actorUserId ?? null,
    organizationId: params.organizationId,
    provider: params.provider,
    status: params.result.status,
    reason: params.reason,
    httpStatus: params.httpStatus,
  });
  return params.result;
}

function resolveStatusFromChecks(checks: ProviderHealthCheck[]) {
  return checks.every((check) => check.ok) ? "ok" : "warning";
}

async function runProviderHealth(params: {
  provider: ProviderType;
  envKeys: readonly (keyof Env)[];
  listLabel: string;
  listCandidates: ListCandidates;
  organizationId: string;
  actorUserId?: string | null;
}): Promise<ProviderHealthResult> {
  if (isMockMode()) {
    const result = buildMockResult(params.provider);
    return finalizeHealthResult({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      provider: params.provider,
      result,
      reason: "mock",
    });
  }

  const envCheck = resolveEnvCheck(params.envKeys);
  const account = await getProviderAccount(params.organizationId, params.provider);
  const hasToken = Boolean(account?.tokenEncrypted);

  if (!envCheck.ok) {
    const outcome = buildBlockedResult({
      provider: params.provider,
      envCheck,
      hasToken,
      blockedReason: {
        cause: "必須環境変数が未設定です。",
        nextActions: ["環境変数を設定して再実行してください。"],
      },
      status: "not_configured",
      apiSummary: "未実行（環境変数が未設定）",
      reason: "not_configured",
    });
    return finalizeHealthResult({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      provider: params.provider,
      result: outcome.result,
      reason: outcome.reason,
    });
  }

  const baseChecks: ProviderHealthCheck[] = [buildEnvCheckResult(envCheck)];

  if (!account?.tokenEncrypted) {
    const outcome = buildNotConnectedResult(params.provider, envCheck);
    return finalizeHealthResult({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      provider: params.provider,
      result: outcome.result,
      reason: outcome.reason,
    });
  }

  const checks = [...baseChecks, buildConnectionCheck(true)];

  try {
    const items = await params.listCandidates({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId ?? null,
    });
    const outcome = buildSuccessResult({
      provider: params.provider,
      envCheck,
      checks,
      listLabel: params.listLabel,
      itemCount: items.length,
    });
    return finalizeHealthResult({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      provider: params.provider,
      result: outcome.result,
      reason: outcome.reason,
    });
  } catch (error) {
    const providerError = toProviderError(params.provider, error);
    const outcome = buildErrorResult({
      provider: params.provider,
      envCheck,
      checks,
      error: providerError,
    });
    return finalizeHealthResult({
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId,
      provider: params.provider,
      result: outcome.result,
      reason: outcome.reason,
      httpStatus: outcome.httpStatus,
    });
  }
}

export async function checkGoogleHealth(params: {
  organizationId: string;
  actorUserId?: string | null;
}): Promise<ProviderHealthResult> {
  return runProviderHealth({
    provider: ProviderType.GoogleBusinessProfile,
    envKeys: googleEnvKeys,
    listLabel: "ロケーション",
    listCandidates: listGoogleLocationCandidates,
    organizationId: params.organizationId,
    actorUserId: params.actorUserId ?? null,
  });
}

export async function checkMetaHealth(params: {
  organizationId: string;
  actorUserId?: string | null;
}): Promise<ProviderHealthResult> {
  const result = await runProviderHealth({
    provider: ProviderType.Meta,
    envKeys: metaEnvKeys,
    listLabel: "ページ",
    listCandidates: listMetaPageCandidates,
    organizationId: params.organizationId,
    actorUserId: params.actorUserId ?? null,
  });
  if (result.status === "not_configured" || result.status === "not_connected") {
    return result;
  }
  const account = await getProviderAccount(
    params.organizationId,
    ProviderType.Meta
  );
  const readiness = await resolveMetaCommentReadiness({
    organizationId: params.organizationId,
    accountMetadata: account?.metadata ?? null,
  });
  return applyMetaCommentReadiness(result, readiness);
}
