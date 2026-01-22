import { NextRequest } from "next/server";

import { getSessionUser } from "@/server/auth/session";
import { isSystemAdmin } from "@/server/auth/rbac";
import { ProviderType } from "@/server/providers/types";
import { exportAuditLogsCsv } from "@/server/services/audit-log-export";
import type { AuditLogFilters } from "@/server/services/audit-logs";
import { isSupabaseConfigured } from "@/server/utils/env";

const MAX_EXPORT_ROWS = 5000;

function resolveProvider(value: string | null): ProviderType | "all" {
  if (!value) return "all";
  const values = new Set(Object.values(ProviderType));
  return values.has(value as ProviderType) ? (value as ProviderType) : "all";
}

function buildFilters(params: URLSearchParams): AuditLogFilters {
  return {
    from: params.get("from"),
    to: params.get("to"),
    action: params.get("action"),
    organizationId: params.get("org"),
    actor: params.get("actor"),
    providerType: resolveProvider(params.get("provider")),
    text: params.get("text"),
  };
}

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const user = await getSessionUser();
    if (!user) {
      return new Response("サインインが必要です。", { status: 401 });
    }
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return new Response("システム管理者権限が必要です。", { status: 403 });
    }
  }

  const filters = buildFilters(request.nextUrl.searchParams);
  const result = await exportAuditLogsCsv({
    filters,
    maxRows: MAX_EXPORT_ROWS,
  });

  if (!result.ok) {
    return new Response(result.error, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  return new Response(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-logs_${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
