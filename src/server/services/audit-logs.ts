import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseConfigured } from "@/server/utils/env";
import { mockAuditLogs } from "@/server/services/mock-data";

export type AuditLog = {
  id: string;
  action: string;
  actorEmail?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export async function listAuditLogs(): Promise<AuditLog[]> {
  if (!isSupabaseConfigured()) {
    return mockAuditLogs;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    action: row.action,
    createdAt: row.created_at,
    metadata: row.metadata_json ?? {},
  }));
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
