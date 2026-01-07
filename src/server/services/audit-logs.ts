import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { getSessionUser } from "@/server/auth/session";
import { isSystemAdmin } from "@/server/auth/rbac";
import type { ProviderType } from "@/server/providers/types";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockAuditLogs } from "@/server/services/mock-data";

export type AuditLog = {
  id: string;
  action: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type AuditLogFilters = {
  from?: string | null;
  to?: string | null;
  action?: string | null;
  organizationId?: string | null;
  actor?: string | null;
  providerType?: ProviderType | "all" | null;
  text?: string | null;
};

export type AuditLogPage = {
  logs: AuditLog[];
  page: number;
  pageSize: number;
  hasNext: boolean;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const sensitiveKeyPatterns = [
  "token",
  "secret",
  "password",
  "key",
  "refresh",
  "authorization",
  "invite",
];

function sanitizeMetadata(input: Record<string, unknown>): Record<string, unknown> {
  const sanitizeValue = (key: string, value: unknown): unknown => {
    const lowered = key.toLowerCase();
    if (sensitiveKeyPatterns.some((pattern) => lowered.includes(pattern))) {
      return "（マスク済み）";
    }
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === "object" && item !== null
          ? sanitizeMetadata(item as Record<string, unknown>)
          : item
      );
    }
    if (value && typeof value === "object") {
      return sanitizeMetadata(value as Record<string, unknown>);
    }
    return value;
  };

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      sanitizeValue(key, value),
    ])
  );
}

function parseDateBoundary(value: string, boundary: "start" | "end") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (value.length <= 10) {
    if (boundary === "start") {
      date.setHours(0, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
  }
  return date.toISOString();
}

function normalizeFilters(filters?: AuditLogFilters) {
  return {
    from: filters?.from?.trim() || null,
    to: filters?.to?.trim() || null,
    action: filters?.action?.trim() || null,
    organizationId: filters?.organizationId?.trim() || null,
    actor: filters?.actor?.trim() || null,
    providerType:
      filters?.providerType && filters.providerType !== "all"
        ? filters.providerType
        : null,
    text: filters?.text?.trim() || null,
  };
}

function clampPageSize(value: number | undefined) {
  if (!value || Number.isNaN(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(value, 5), MAX_PAGE_SIZE);
}

function matchesFreeText(log: AuditLog, text: string) {
  const target = [
    log.action,
    log.actorEmail,
    log.actorUserId,
    log.organizationName,
    log.organizationId,
    log.targetType,
    log.targetId,
    JSON.stringify(log.metadata ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return target.includes(text.toLowerCase());
}

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

async function resolveActorEmailMap(
  admin: SupabaseAdminClient,
  userIds: string[]
) {
  const map = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const { data } = await admin.auth.admin.getUserById(userId);
        map.set(userId, data.user?.email ?? null);
      } catch {
        map.set(userId, null);
      }
    })
  );
  return map;
}

async function resolveActorUserIdByEmail(
  admin: SupabaseAdminClient,
  email: string
) {
  try {
    const { data } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const normalized = email.toLowerCase();
    const found = data.users?.find(
      (user) => user.email?.toLowerCase() === normalized
    );
    return found?.id ?? null;
  } catch {
    return null;
  }
}

export async function queryAuditLogs(input?: {
  filters?: AuditLogFilters;
  page?: number;
  pageSize?: number;
}): Promise<AuditLogPage> {
  const normalized = normalizeFilters(input?.filters);
  const page = input?.page && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = clampPageSize(input?.pageSize);

  if (!isSupabaseConfigured()) {
    const filtered = mockAuditLogs.filter((log) => {
      if (normalized.action && log.action !== normalized.action) {
        return false;
      }
      if (normalized.organizationId && log.organizationId !== normalized.organizationId) {
        return false;
      }
      if (normalized.actor) {
        const actor = normalized.actor.toLowerCase();
        if (
          !log.actorEmail?.toLowerCase().includes(actor) &&
          log.actorUserId?.toLowerCase() !== actor
        ) {
          return false;
        }
      }
      if (normalized.providerType) {
        const provider = normalized.providerType;
        const metadata = log.metadata as Record<string, unknown>;
        const providerValue =
          (metadata.provider as string | undefined) ??
          (metadata.provider_type as string | undefined);
        if (log.targetId !== provider && providerValue !== provider) {
          return false;
        }
      }
      if (normalized.from) {
        const fromIso = parseDateBoundary(normalized.from, "start");
        if (fromIso && log.createdAt < fromIso) return false;
      }
      if (normalized.to) {
        const toIso = parseDateBoundary(normalized.to, "end");
        if (toIso && log.createdAt > toIso) return false;
      }
      return true;
    });

    const filteredByText = normalized.text
      ? filtered.filter((log) => matchesFreeText(log, normalized.text ?? ""))
      : filtered;
    const start = (page - 1) * pageSize;
    const slice = filteredByText.slice(start, start + pageSize + 1);
    const hasNext = slice.length > pageSize;
    const logs = slice.slice(0, pageSize).map((log) => ({
      ...log,
      metadata: sanitizeMetadata(log.metadata ?? {}),
    }));

    return { logs, page, pageSize, hasNext };
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { logs: [], page, pageSize, hasNext: false };
  }
  const adminAllowed = await isSystemAdmin(sessionUser.id);
  if (!adminAllowed) {
    return { logs: [], page, pageSize, hasNext: false };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { logs: [], page, pageSize, hasNext: false };

  let query = admin
    .from("audit_logs")
    .select(
      "id, action, actor_user_id, organization_id, target_type, target_id, metadata_json, created_at, organizations(name)"
    )
    .order("created_at", { ascending: false });

  const fromIso = normalized.from
    ? parseDateBoundary(normalized.from, "start")
    : null;
  const toIso = normalized.to
    ? parseDateBoundary(normalized.to, "end")
    : null;

  if (fromIso) {
    query = query.gte("created_at", fromIso);
  }
  if (toIso) {
    query = query.lte("created_at", toIso);
  }
  if (normalized.action) {
    query = query.eq("action", normalized.action);
  }
  if (normalized.organizationId) {
    query = query.eq("organization_id", normalized.organizationId);
  }
  if (normalized.actor) {
    const actorValue = normalized.actor;
    if (actorValue.includes("@")) {
      const resolvedId = await resolveActorUserIdByEmail(admin, actorValue);
      if (!resolvedId) {
        return { logs: [], page, pageSize, hasNext: false };
      }
      query = query.eq("actor_user_id", resolvedId);
    } else {
      query = query.eq("actor_user_id", actorValue);
    }
  }
  if (normalized.providerType) {
    const provider = normalized.providerType;
    query = query.or(
      `metadata_json->>provider.eq.${provider},metadata_json->>provider_type.eq.${provider},target_id.eq.${provider}`
    );
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const { data, error } = await query.range(start, end);
  if (error || !data) return { logs: [], page, pageSize, hasNext: false };

  const sliced = data.slice(0, pageSize);
  const hasNext = data.length > pageSize;
  const actorIds = Array.from(
    new Set(
      sliced
        .map((row) => row.actor_user_id as string | null)
        .filter((value): value is string => Boolean(value))
    )
  );
  const actorEmailMap = actorIds.length
    ? await resolveActorEmailMap(admin, actorIds)
    : new Map<string, string | null>();

  const logs = sliced.map((row) => {
    const metadata = (row.metadata_json ?? {}) as Record<string, unknown>;
    const org = (row.organizations as { name?: string } | null) ?? null;
    return {
      id: row.id as string,
      action: row.action as string,
      actorUserId: (row.actor_user_id as string | null) ?? null,
      actorEmail: row.actor_user_id
        ? actorEmailMap.get(row.actor_user_id as string) ?? null
        : null,
      organizationId: (row.organization_id as string | null) ?? null,
      organizationName: org?.name ?? null,
      targetType: (row.target_type as string | null) ?? null,
      targetId: (row.target_id as string | null) ?? null,
      createdAt: row.created_at as string,
      metadata: sanitizeMetadata(metadata),
    } satisfies AuditLog;
  });

  const logsFiltered = normalized.text
    ? logs.filter((log) => matchesFreeText(log, normalized.text ?? ""))
    : logs;

  return { logs: logsFiltered, page, pageSize, hasNext };
}

export async function listAuditLogs(): Promise<AuditLog[]> {
  const page = await queryAuditLogs({ pageSize: 50 });
  return page.logs;
}

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  organizationId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("audit_logs").insert({
    actor_user_id: input.actorUserId ?? null,
    organization_id: input.organizationId ?? null,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata_json: input.metadata ?? {},
  });
}
