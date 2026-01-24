import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { ProviderType } from "@/server/providers/types";
import { listLocations } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { searchPlaces } from "@/server/services/places";
import { isSupabaseConfigured } from "@/server/utils/env";

import { LocationCreateForm } from "./LocationCreateForm";

const searchProviders = [
  { value: ProviderType.BingMaps, label: "Bing Maps" },
  { value: ProviderType.YahooYolp, label: "Yahoo! YOLP" },
];

type SearchParams = {
  query?: string;
  provider?: string;
};

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams: SearchParams = (await searchParams) ?? {};
  const user = await getSessionUser();
  const org = user ? await getPrimaryOrganization(user.id) : null;
  const locations = org ? await listLocations(org.id) : [];
  const role = user && org ? await getMembershipRole(user.id, org.id) : null;
  const canCreate = hasRequiredRole(role, "admin");
  const supabaseConfigured = isSupabaseConfigured();

  const providerValue = searchProviders.some(
    (provider) => provider.value === resolvedSearchParams.provider
  )
    ? (resolvedSearchParams.provider as ProviderType)
    : ProviderType.BingMaps;

  let results = [] as Awaited<ReturnType<typeof searchPlaces>>;
  let searchError: string | null = null;
  if (resolvedSearchParams.query && resolvedSearchParams.query.length > 1) {
    try {
      results = await searchPlaces(providerValue, resolvedSearchParams.query);
    } catch (error) {
      searchError = error instanceof Error ? error.message : "検索に失敗しました";
    }
  }

  let createDisabledReason: string | null = null;
  if (!supabaseConfigured) {
    createDisabledReason = "設定が未完了のため作成できません。";
  } else if (!user) {
    createDisabledReason = "ログインが必要です。";
  } else if (!org) {
    createDisabledReason = "管理者情報が確認できません。管理者に確認してください。";
  } else if (!canCreate) {
    createDisabledReason = "管理者のみ操作できます。管理者に確認してください。";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">店舗</h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          店舗情報と連携サービスを管理します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">
            店舗を追加
          </h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            店舗を追加して連携サービスの対象を増やします。
          </p>
        </CardHeader>
        <CardContent>
          <LocationCreateForm disabledReason={createDisabledReason} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">
                店舗一覧
              </h2>
              <Badge variant="default">{locations.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {locations.map((location) => (
              <Link
                key={location.id}
                href={`/app/locations/${location.id}`}
                className="block rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 transition hover:border-[color:var(--border-muted)]"
              >
                <p className="text-sm font-semibold text-[color:var(--text-strong)]">
                  {location.name}
                </p>
                <p className="text-sm text-[color:var(--text-muted)]">
                  {location.address ?? "住所が未登録です"}
                </p>
              </Link>
            ))}
            {locations.length === 0 && (
              <p className="text-sm text-[color:var(--text-muted)]">
                まだ店舗がありません。
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">
              地図検索
            </h2>
            <p className="text-sm text-[color:var(--text-muted)]">
              住所候補を検索して店舗登録を補助します。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" method="get">
              <FormField label="検索サービス">
                <Select name="provider" defaultValue={providerValue}>
                  {searchProviders.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="キーワード">
                <Input
                  name="query"
                  placeholder="店舗名や住所を入力"
                  defaultValue={resolvedSearchParams.query}
                />
              </FormField>
              <Button type="submit" className="w-full">
                検索する
              </Button>
            </form>

            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2"
                >
                  <p className="text-sm font-semibold text-[color:var(--text-strong)]">
                    {result.name}
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {result.address ?? "住所情報なし"}
                  </p>
                </div>
              ))}
              {searchError && (
                <p className="text-sm text-amber-600">{searchError}</p>
              )}
              {results.length === 0 && resolvedSearchParams.query && (
                <p className="text-sm text-[color:var(--text-muted)]">
                  結果がありません。別のキーワードを試してください。
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
