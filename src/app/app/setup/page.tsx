import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMembershipRole, isSystemAdmin } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { ProviderType } from "@/server/providers/types";
import { countLocationProviderLinks } from "@/server/services/location-provider-links";
import { listLocations } from "@/server/services/locations";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { listProviderConnections } from "@/server/services/provider-connections";

const connectionLabels = {
  connected: "接続済み",
  not_connected: "未接続",
  reauth_required: "再認可が必要",
  unknown: "未判定",
} as const;

function resolveConnectionBadge(status: keyof typeof connectionLabels) {
  if (status === "connected") {
    return { label: connectionLabels[status], variant: "success" as const };
  }
  if (status === "unknown") {
    return { label: connectionLabels[status], variant: "muted" as const };
  }
  return { label: connectionLabels[status], variant: "warning" as const };
}

function resolveLinkBadge(params: {
  linkedCount: number;
  totalLocations: number;
}) {
  if (params.totalLocations === 0) {
    return { label: "未作成", variant: "muted" as const };
  }
  if (params.linkedCount > 0) {
    return {
      label: `紐付け済み ${params.linkedCount}/${params.totalLocations}`,
      variant: "success" as const,
    };
  }
  return { label: "未紐付け", variant: "warning" as const };
}

export default async function SetupChecklistPage() {
  const user = await getSessionUser();
  const org = user ? await getPrimaryOrganization(user.id) : null;
  const locations = org ? await listLocations(org.id) : [];
  const locationIds = locations.map((location) => location.id);
  const connections = org ? await listProviderConnections(org.id, user?.id) : [];
  const googleConnection =
    connections.find((item) => item.provider === ProviderType.GoogleBusinessProfile)
      ?.status ?? "unknown";
  const metaConnection =
    connections.find((item) => item.provider === ProviderType.Meta)?.status ??
    "unknown";
  const googleLinks = org
    ? await countLocationProviderLinks({
        locationIds,
        provider: ProviderType.GoogleBusinessProfile,
      })
    : 0;
  const metaLinks = org
    ? await countLocationProviderLinks({
        locationIds,
        provider: ProviderType.Meta,
      })
    : 0;
  const isAdmin = user ? await isSystemAdmin(user.id) : false;
  const role = user && org ? await getMembershipRole(user.id, org.id) : null;

  const locationBadge =
    locations.length > 0
      ? { label: `${locations.length}件`, variant: "success" as const }
      : { label: "未作成", variant: "warning" as const };
  const googleBadge = resolveConnectionBadge(googleConnection);
  const metaBadge = resolveConnectionBadge(metaConnection);
  const googleLinkBadge = resolveLinkBadge({
    linkedCount: googleLinks,
    totalLocations: locations.length,
  });
  const metaLinkBadge = resolveLinkBadge({
    linkedCount: metaLinks,
    totalLocations: locations.length,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          セットアップチェック
        </h1>
        <p className="text-sm text-slate-500">
          迷わず進めるための薄いチェックリストです（状態は概算）。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">ロケーション</p>
              <Badge variant={locationBadge.variant}>
                {locationBadge.label}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              プロバイダ連携の対象となる拠点を作成します。
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-600">
            <p>権限: {role ?? "未判定"}</p>
            <Link
              href="/app/locations"
              className="inline-flex text-amber-600 underline"
            >
              ロケーション一覧を開く
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Google</p>
              <Badge variant={googleBadge.variant}>{googleBadge.label}</Badge>
            </div>
            <p className="text-xs text-slate-500">
              接続→GBPロケーション紐付け→投稿テストの順で確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>紐付け</span>
              <Badge variant={googleLinkBadge.variant}>
                {googleLinkBadge.label}
              </Badge>
            </div>
            <Link
              href="/app/locations"
              className="inline-flex text-amber-600 underline"
            >
              ロケーション詳細から接続する
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Meta</p>
              <Badge variant={metaBadge.variant}>{metaBadge.label}</Badge>
            </div>
            <p className="text-xs text-slate-500">
              接続→Facebookページ紐付け→投稿テストの順で確認します。
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>紐付け</span>
              <Badge variant={metaLinkBadge.variant}>
                {metaLinkBadge.label}
              </Badge>
            </div>
            <Link
              href="/app/locations"
              className="inline-flex text-amber-600 underline"
            >
              ロケーション詳細から接続する
            </Link>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <p className="text-sm font-semibold text-slate-900">管理者向け</p>
              <p className="text-xs text-slate-500">
                設定状況と実機チェックをまとめて確認できます。
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              <Link
                href="/admin/diagnostics"
                className="inline-flex text-amber-600 underline"
              >
                診断を開く
              </Link>
              <Link
                href="/admin/provider-health"
                className="inline-flex text-amber-600 underline"
              >
                実機ヘルスチェックを開く
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
