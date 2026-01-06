import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    createDisabledReason = "Supabaseが未設定のため作成できません。";
  } else if (!user) {
    createDisabledReason = "ログインが必要です。";
  } else if (!org) {
    createDisabledReason = "所属組織が見つかりません。管理者に確認してください。";
  } else if (!canCreate) {
    createDisabledReason =
      "権限がありません。管理者に権限付与を依頼してください。";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">ロケーション</h1>
        <p className="text-sm text-slate-500">
          店舗ロケーションとプロバイダ連携を管理します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            ロケーション新規作成
          </h2>
          <p className="text-xs text-slate-500">
            ロケーションを追加してプロバイダ連携の対象を増やします。
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
              <h2 className="text-lg font-semibold text-slate-900">
                ロケーション一覧
              </h2>
              <Badge variant="default">{locations.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {locations.map((location) => (
              <Link
                key={location.id}
                href={`/app/locations/${location.id}`}
                className="block rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {location.name}
                </p>
                <p className="text-xs text-slate-500">
                  {location.address ?? "住所が未登録です"}
                </p>
              </Link>
            ))}
            {locations.length === 0 && (
              <p className="text-sm text-slate-500">
                まだロケーションがありません。
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              地図検索
            </h2>
            <p className="text-xs text-slate-500">
              住所候補を検索してロケーション登録を補助します。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" method="get">
              <Select name="provider" defaultValue={providerValue}>
                {searchProviders.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </Select>
              <Input
                name="query"
                placeholder="店舗名や住所を入力"
                defaultValue={resolvedSearchParams.query}
              />
              <button className="h-10 w-full rounded-md bg-slate-900 text-sm font-semibold text-white">
                検索する
              </button>
            </form>

            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2"
                >
                  <p className="text-xs font-semibold text-slate-900">
                    {result.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {result.address ?? "住所情報なし"}
                  </p>
                </div>
              ))}
              {searchError && (
                <p className="text-xs text-amber-600">{searchError}</p>
              )}
              {results.length === 0 && resolvedSearchParams.query && (
                <p className="text-xs text-slate-500">
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
