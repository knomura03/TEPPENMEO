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
