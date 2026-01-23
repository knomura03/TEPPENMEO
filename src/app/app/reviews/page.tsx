import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { buildHrefWithParams } from "@/lib/pagination";
import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { ProviderType } from "@/server/providers/types";
import { toProviderError } from "@/server/providers/errors";
import { listLocations } from "@/server/services/locations";
import { countLocationProviderLinks } from "@/server/services/location-provider-links";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { listProviderConnections } from "@/server/services/provider-connections";
import {
  listReviewsInboxPage,
  type ReviewsInboxFilters,
} from "@/server/services/reviews-inbox";
import {
  syncMetaCommentsForOrganization,
  toMetaCommentUiError,
} from "@/server/services/meta-comments";

import { createReviewColumns } from "./columns";

type SearchParams = {
  q?: string;
  provider?: string;
  locationId?: string;
  period?: string;
  unreplied?: string;
  page?: string;
};

const providerOptions = [
  { value: "all", label: "すべて" },
  { value: ProviderType.GoogleBusinessProfile, label: "Google口コミ" },
  { value: ProviderType.Meta, label: "SNSコメント（Facebook/Instagram）" },
];

const periodOptions = [
  { value: "7d", label: "過去7日" },
  { value: "30d", label: "過去30日" },
  { value: "all", label: "全期間" },
];

const actionLinkSecondary =
  buttonStyles({ variant: "secondary", size: "md" });
const actionLinkAccent =
  buttonStyles({
    variant: "secondary",
    size: "md",
    className:
      "border-[color:var(--primary)]/20 bg-[color:var(--primary)]/10 text-[color:var(--primary)] hover:bg-[color:var(--primary)]/20",
  });

function resolvePeriod(period?: string): { period: string; from: string | null } {
  if (period === "7d") {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return { period, from: from.toISOString() };
  }
  if (period === "30d") {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return { period, from: from.toISOString() };
  }
  return { period: "all", from: null };
}

function resolveProvider(value?: string): ReviewsInboxFilters["provider"] {
  if (value === ProviderType.GoogleBusinessProfile) return value;
  if (value === ProviderType.Meta) return value;
  return "all";
}

export default async function ReviewsInboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams: SearchParams = (await searchParams) ?? {};
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          口コミ・コメント受信箱
        </h1>
        <p className="text-sm text-slate-500">
          ログイン後に口コミ対応を開始できます。
        </p>
        <Link
          href="/auth/sign-in"
          className="text-[color:var(--primary)] underline"
        >
          サインインへ
        </Link>
      </div>
    );
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          口コミ・コメント受信箱
        </h1>
        <p className="text-sm text-slate-500">
          所属組織が見つかりません。組織管理者に確認してください。
        </p>
      </div>
    );
  }

  const locations = await listLocations(org.id);
  const role = await getMembershipRole(user.id, org.id);
  const canReply = hasRequiredRole(role, "admin");

  const pageNumber = Number(resolvedSearchParams.page ?? 1);
  const page = Number.isFinite(pageNumber) ? Math.max(pageNumber, 1) : 1;
  const onlyUnreplied = resolvedSearchParams.unreplied === "1";
  const { period, from } = resolvePeriod(resolvedSearchParams.period);
  const provider = resolveProvider(resolvedSearchParams.provider);
  const locationId =
    resolvedSearchParams.locationId && resolvedSearchParams.locationId !== "all"
      ? resolvedSearchParams.locationId
      : null;
  const targetLocationIds =
    locationId !== null
      ? [locationId]
      : locations.map((location) => location.id);

  const connections = await listProviderConnections(org.id, user.id);
  const metaConnection = connections.find(
    (item) => item.provider === ProviderType.Meta
  );
  const metaLinkCount = await countLocationProviderLinks({
    locationIds: targetLocationIds,
    provider: ProviderType.Meta,
  });

  let socialNotice: { cause: string; nextAction: string } | null = null;
  if (provider === ProviderType.Meta || provider === "all") {
    if (!metaConnection || metaConnection.status === "not_connected") {
      socialNotice = {
        cause: "SNSコメントを見るには連携サービスの接続が必要です。",
        nextAction: "初期設定からFacebook/Instagramをつないでください。",
      };
    } else if (metaConnection.status === "reauth_required") {
      socialNotice = {
        cause: "連携サービスの再接続が必要です。",
        nextAction: "初期設定からつなぎ直してください。",
      };
    } else if (metaLinkCount === 0) {
      socialNotice = {
        cause: "店舗とFacebookページの紐付けが必要です。",
        nextAction: "店舗詳細で紐付けを設定してください。",
      };
    } else {
      try {
        await syncMetaCommentsForOrganization({
          organizationId: org.id,
          locationIds: targetLocationIds,
          actorUserId: user.id,
        });
      } catch (error) {
        const providerError = toProviderError(ProviderType.Meta, error);
        socialNotice = toMetaCommentUiError(providerError);
      }
    }
  }

  const inboxPage = await listReviewsInboxPage({
    organizationId: org.id,
    page,
    filters: {
      onlyUnreplied,
      provider,
      locationId,
      from,
      to: null,
      query: resolvedSearchParams.q ?? "",
    },
  });

  const totalPages = Math.max(
    1,
    Math.ceil(inboxPage.total / inboxPage.pageSize)
  );
  const basePath = "/app/reviews";
  const prevHref =
    page > 1
      ? buildHrefWithParams(basePath, resolvedSearchParams, {
          page: page - 1,
        })
      : null;
  const nextHref =
    page < totalPages
      ? buildHrefWithParams(basePath, resolvedSearchParams, {
          page: page + 1,
        })
      : null;
  const pageSummary = `全${inboxPage.total}件 / ${page} / ${totalPages}ページ`;
  const columns = createReviewColumns({ canReply });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          口コミ・コメント受信箱
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          店舗を横断して口コミ・コメントを確認し、返信対応を進めます。
        </p>
      </div>

      <Card tone="light">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">フィルタ</h2>
          <p className="text-sm text-slate-600">
            未返信のみや期間で絞り込み、対応漏れを減らします。
          </p>
        </CardHeader>
        <CardContent>
          {socialNotice && (
            <div className="mb-4">
              <Card tone="amber">
                <CardContent className="text-sm text-amber-900">
                  <p className="font-semibold">{socialNotice.cause}</p>
                  <p className="mt-1">{socialNotice.nextAction}</p>
                </CardContent>
              </Card>
            </div>
          )}
          <form method="get" className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <FormField label="検索">
                <Input
                  name="q"
                  placeholder="投稿者・本文・店舗名で検索"
                  defaultValue={resolvedSearchParams.q ?? ""}
                />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <FormField label="店舗">
                <Select name="locationId" defaultValue={locationId ?? "all"}>
                  <option value="all">全店舗</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="md:col-span-1">
              <FormField label="連携サービス">
                <Select name="provider" defaultValue={provider}>
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="md:col-span-1">
              <FormField label="期間">
                <Select name="period" defaultValue={period}>
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                name="unreplied"
                value="1"
                defaultChecked={onlyUnreplied}
                className="h-4 w-4 rounded border-slate-300"
              />
              未返信のみ
            </label>
            <div className="flex flex-wrap items-center gap-3 md:col-span-6">
              <Button type="submit" size="md">
                適用
              </Button>
              <Link
                href="/docs/runbooks/reviews-inbox"
                className={actionLinkAccent}
              >
                運用手順書を見る
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card tone="light">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              口コミ・コメント一覧
            </h2>
            <Badge variant="default">{inboxPage.total}件</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {inboxPage.items.length === 0 ? (
            <EmptyState
              title="条件に一致する口コミがありません。"
              description="口コミ・コメントの取得状況を確認し、条件を調整してください。"
              actions={
                <Link href="/app/locations" className={actionLinkSecondary}>
                  店舗へ
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column.header}
                      className={column.headerClassName}
                    >
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {inboxPage.items.map((review) => (
                  <TableRow key={review.id}>
                    {columns.map((column) => (
                      <TableCell
                        key={`${review.id}-${column.header}`}
                        className={column.cellClassName}
                      >
                        {column.cell(review)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        summary={pageSummary}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  );
}
