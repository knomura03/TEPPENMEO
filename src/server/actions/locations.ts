"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { createLocation } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { isSupabaseConfigured } from "@/server/utils/env";

export type CreateLocationState = {
  error: string | null;
};

const optionalNumber = (min: number, max: number, label: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const numberValue = Number(trimmed);
      return Number.isFinite(numberValue) ? numberValue : value;
    },
    z
      .number({
        invalid_type_error: `${label}は数値で入力してください`,
      })
      .min(min, `${label}は${min}以上で入力してください`)
      .max(max, `${label}は${max}以下で入力してください`)
      .optional()
  );

const locationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "ロケーション名は必須です"),
  address: z.string().trim().optional(),
  latitude: optionalNumber(-90, 90, "緯度"),
  longitude: optionalNumber(-180, 180, "経度"),
});

export async function createLocationAction(
  prevState: CreateLocationState,
  formData: FormData
): Promise<CreateLocationState> {
  void prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabaseが未設定のため作成できません。" };
  }

  const user = await getSessionUser();
  if (!user) {
    return { error: "ログインが必要です。" };
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return { error: "所属組織が見つかりません。管理者に確認してください。" };
  }

  const role = await getMembershipRole(user.id, org.id);
  if (!hasRequiredRole(role, "admin")) {
    return { error: "権限がありません。管理者に権限付与を依頼してください。" };
  }

  const parsed = locationSchema.safeParse({
    name: formData.get("name") ?? "",
    address: formData.get("address") ?? "",
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容が不正です。" };
  }

  const created = await createLocation({
    organizationId: org.id,
    name: parsed.data.name,
    address: parsed.data.address?.trim() || null,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
  });

  if (!created) {
    return { error: "ロケーション作成に失敗しました。再度お試しください。" };
  }

  redirect(`/app/locations/${created.id}`);
}
