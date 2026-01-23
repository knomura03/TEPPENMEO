"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getActiveSessionUser } from "@/server/auth/session";
import { createLocation } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { isSupabaseConfigured } from "@/server/utils/env";

export type CreateLocationState = {
  error: string | null;
};

const optionalNumber = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}は数値で入力してください`,
        });
        return z.NEVER;
      }
      if (numberValue < min || numberValue > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}は${min}〜${max}の範囲で入力してください`,
        });
        return z.NEVER;
      }
      return numberValue;
    });

const locationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "店舗名は必須です"),
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

  const user = await getActiveSessionUser();
  if (!user) {
    return { error: "ログインが必要です。" };
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return { error: "管理者情報が確認できません。管理者に確認してください。" };
  }

  const role = await getMembershipRole(user.id, org.id);
  if (!hasRequiredRole(role, "admin")) {
    return { error: "管理者のみ操作できます。管理者に確認してください。" };
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
    return { error: "店舗の追加に失敗しました。再度お試しください。" };
  }

  redirect(`/app/locations/${created.id}`);
}
