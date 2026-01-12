import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import "./_load-env";
import { formatSeedEnvErrors, type EnvIssue } from "../src/lib/seed-env";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SYSTEM_ADMIN_EMAIL: z.string().email(),
  SYSTEM_ADMIN_PASSWORD: z.string().min(8).optional(),
});

const rawEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SYSTEM_ADMIN_EMAIL: process.env.SYSTEM_ADMIN_EMAIL,
  SYSTEM_ADMIN_PASSWORD: process.env.SYSTEM_ADMIN_PASSWORD,
};

const parsed = envSchema.safeParse(rawEnv);
if (!parsed.success) {
  const issueMap: Record<string, EnvIssue> = {};
  parsed.error.issues.forEach((issue) => {
    const key = issue.path[0];
    if (typeof key !== "string") return;
    if (issue.code === "invalid_type") {
      const value = rawEnv[key as keyof typeof rawEnv];
      if (value === undefined) {
        issueMap[key] = "missing";
        return;
      }
    }
    issueMap[key] = "invalid";
  });
  console.error(formatSeedEnvErrors(issueMap));
  process.exit(1);
}

const env = parsed.data;

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function ensureAdminUser() {
  const email = env.SYSTEM_ADMIN_EMAIL;
  const { data: existing, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) {
    throw new Error(`管理ユーザーの取得に失敗しました: ${error.message}`);
  }

  const found = existing?.users.find((user) => user.email === email);
  if (found) return found;

  const password =
    env.SYSTEM_ADMIN_PASSWORD ?? crypto.randomBytes(12).toString("hex");
  const { data, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !data.user) {
    throw new Error(`管理ユーザーの作成に失敗しました: ${createError?.message}`);
  }

  if (!env.SYSTEM_ADMIN_PASSWORD) {
    console.log(`管理ユーザーの自動生成パスワード: ${password}`);
  }

  return data.user;
}

async function ensureSystemAdmin(userId: string) {
  const { error } = await supabase.from("system_admins").upsert({
    user_id: userId,
  });

  if (error) {
    throw new Error(`システム管理者の登録に失敗しました: ${error.message}`);
  }
}

async function ensureOrganization(userId: string) {
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id,name")
    .eq("name", "TEPPEN デモ組織")
    .maybeSingle();

  if (error) {
    throw new Error(`組織の取得に失敗しました: ${error.message}`);
  }

  if (orgs?.id) return orgs;

  const { data, error: insertError } = await supabase
    .from("organizations")
    .insert({ name: "TEPPEN デモ組織" })
    .select("id,name")
    .single();

  if (insertError || !data) {
    throw new Error(`組織の作成に失敗しました: ${insertError?.message}`);
  }

  const { error: membershipError } = await supabase.from("memberships").insert({
    organization_id: data.id,
    user_id: userId,
    role: "owner",
  });

  if (membershipError) {
    throw new Error(`メンバー登録に失敗しました: ${membershipError.message}`);
  }

  return data;
}

async function ensureLocation(orgId: string) {
  const { data, error } = await supabase
    .from("locations")
    .select("id")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) {
    throw new Error(`ロケーション取得に失敗しました: ${error.message}`);
  }

  if (data?.id) return;

  const { error: insertError } = await supabase.from("locations").insert({
    organization_id: orgId,
    name: "TEPPEN 渋谷",
    address: "東京都渋谷区渋谷1-2-3",
    city: "渋谷区",
    region: "東京都",
    postal_code: "150-0002",
    country: "JP",
    latitude: 35.6595,
    longitude: 139.7005,
  });

  if (insertError) {
    throw new Error(`ロケーション作成に失敗しました: ${insertError.message}`);
  }
}

async function run() {
  const adminUser = await ensureAdminUser();
  await ensureSystemAdmin(adminUser.id);
  const org = await ensureOrganization(adminUser.id);
  await ensureLocation(org.id);
  console.log("シード完了");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
