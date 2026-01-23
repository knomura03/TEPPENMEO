import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { mockPostTemplates } from "@/server/services/mock-data";
import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/server/utils/env";

export type TemplateTargets = {
  facebook?: boolean;
  instagram?: boolean;
  google?: boolean;
};

export type PostTemplate = {
  id: string;
  name: string;
  body: string;
  defaultTargets: TemplateTargets;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

export function normalizeTemplateTargets(value: unknown): TemplateTargets {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    facebook: typeof record.facebook === "boolean" ? record.facebook : undefined,
    instagram:
      typeof record.instagram === "boolean" ? record.instagram : undefined,
    google: typeof record.google === "boolean" ? record.google : undefined,
  };
}

function mapTemplateRow(row: Record<string, unknown>): PostTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    body: row.body as string,
    defaultTargets: normalizeTemplateTargets(row.default_targets),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: (row.archived_at as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    updatedBy: (row.updated_by as string | null) ?? null,
  };
}

export async function listPostTemplates(params: {
  organizationId: string;
  includeArchived?: boolean;
}): Promise<{ templates: PostTemplate[]; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { templates: mockPostTemplates, reason: null };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      templates: [],
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため一覧を取得できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { templates: [], reason: "Supabaseの設定を確認してください。" };
  }

  const query = admin
    .from("post_templates")
    .select("*")
    .eq("organization_id", params.organizationId)
    .order("updated_at", { ascending: false });

  if (!params.includeArchived) {
    query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error || !data) {
    if (error?.code === "42P01") {
      return {
        templates: [],
        reason:
          "post_templates マイグレーションが未適用のため一覧を取得できません。",
      };
    }
    return {
      templates: [],
      reason: error?.message ?? "テンプレートの取得に失敗しました。",
    };
  }

  return {
    templates: data.map((row) => mapTemplateRow(row as Record<string, unknown>)),
    reason: null,
  };
}

export async function countPostTemplates(params: {
  organizationId: string;
}): Promise<{ count: number | null; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { count: null, reason: "Supabaseが未設定のため確認できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      count: null,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため確認できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { count: null, reason: "Supabaseの設定を確認してください。" };
  }

  const { count, error } = await admin
    .from("post_templates")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", params.organizationId)
    .is("archived_at", null);

  if (error) {
    if (error.code === "42P01") {
      return {
        count: null,
        reason:
          "post_templates マイグレーションが未適用のため確認できません。",
      };
    }
    return {
      count: null,
      reason: error.message ?? "テンプレートの確認に失敗しました。",
    };
  }

  return { count: count ?? 0, reason: null };
}

export async function createPostTemplate(params: {
  organizationId: string;
  name: string;
  body: string;
  defaultTargets: TemplateTargets;
  actorUserId: string;
}): Promise<{ ok: boolean; id?: string; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "Supabaseが未設定のため保存できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため保存できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, reason: "Supabaseの設定を確認してください。" };
  }

  const payload = {
    organization_id: params.organizationId,
    name: params.name,
    body: params.body,
    default_targets: params.defaultTargets,
    created_by: params.actorUserId,
    updated_by: params.actorUserId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("post_templates")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42P01") {
      return {
        ok: false,
        reason:
          "post_templates マイグレーションが未適用のため保存できません。",
      };
    }
    return {
      ok: false,
      reason: error?.message ?? "テンプレートの保存に失敗しました。",
    };
  }

  return { ok: true, id: data.id as string, reason: null };
}

export async function updatePostTemplate(params: {
  id: string;
  organizationId: string;
  name: string;
  body: string;
  defaultTargets: TemplateTargets;
  actorUserId: string;
}): Promise<{ ok: boolean; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "Supabaseが未設定のため保存できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため保存できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, reason: "Supabaseの設定を確認してください。" };
  }

  const payload = {
    name: params.name,
    body: params.body,
    default_targets: params.defaultTargets,
    updated_by: params.actorUserId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("post_templates")
    .update(payload)
    .eq("id", params.id)
    .eq("organization_id", params.organizationId);

  if (error) {
    if (error.code === "42P01") {
      return {
        ok: false,
        reason:
          "post_templates マイグレーションが未適用のため保存できません。",
      };
    }
    return {
      ok: false,
      reason: error.message ?? "テンプレートの更新に失敗しました。",
    };
  }

  return { ok: true, reason: null };
}

export async function archivePostTemplate(params: {
  id: string;
  organizationId: string;
  actorUserId: string;
}): Promise<{ ok: boolean; reason: string | null }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "Supabaseが未設定のため保存できません。" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY が未設定のため保存できません。",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, reason: "Supabaseの設定を確認してください。" };
  }

  const payload = {
    archived_at: new Date().toISOString(),
    updated_by: params.actorUserId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("post_templates")
    .update(payload)
    .eq("id", params.id)
    .eq("organization_id", params.organizationId);

  if (error) {
    if (error.code === "42P01") {
      return {
        ok: false,
        reason:
          "post_templates マイグレーションが未適用のため保存できません。",
      };
    }
    return {
      ok: false,
      reason: error.message ?? "テンプレートの更新に失敗しました。",
    };
  }

  return { ok: true, reason: null };
}
