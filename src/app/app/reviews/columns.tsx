import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailsDisclosure } from "@/components/ui/details-disclosure";
import { ProviderType } from "@/server/providers/types";
import type { ReviewInboxItem } from "@/server/services/reviews-inbox";

import { ReviewInboxReplyForm } from "./ReviewInboxReplyForm";

type ColumnDef<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

const locationLinkClass = buttonStyles({ variant: "link", size: "sm" });

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleString("ja-JP");
}

function formatRating(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

function providerLabel(provider: ProviderType) {
  if (provider === ProviderType.GoogleBusinessProfile) return "Google";
  if (provider === ProviderType.Meta) return "Meta";
  return "未対応";
}

export function createReviewColumns(params: {
  canReply: boolean;
}): ColumnDef<ReviewInboxItem>[] {
  return [
    {
      header: "日時",
      cell: (review) => formatDate(review.createdAt),
      cellClassName: "whitespace-nowrap font-mono text-xs text-slate-600",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "ロケーション",
      cell: (review) => review.locationName,
      cellClassName: "min-w-[160px]",
    },
    {
      header: "プロバイダ",
      cell: (review) => (
        <Badge variant="muted">{providerLabel(review.provider)}</Badge>
      ),
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "評価",
      cell: (review) => `★ ${formatRating(review.rating)}`,
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "本文",
      cell: (review) => (
        <p className="line-clamp-2 whitespace-pre-wrap text-sm text-slate-700">
          {review.comment ?? "本文がありません。"}
        </p>
      ),
      cellClassName: "min-w-[200px]",
    },
    {
      header: "状態",
      cell: (review) => {
        const replyBadge = review.reply
          ? { label: "返信済み", variant: "success" as const }
          : { label: "未返信", variant: "warning" as const };
        return <Badge variant={replyBadge.variant}>{replyBadge.label}</Badge>;
      },
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "操作",
      cell: (review) => (
        <Link
          href={`/app/locations/${review.locationId}`}
          className={locationLinkClass}
        >
          ロケーション詳細へ
        </Link>
      ),
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "詳細",
      cell: (review) => {
        const isGoogle = review.provider === ProviderType.GoogleBusinessProfile;
        return (
          <DetailsDisclosure
            items={[
              {
                label: "レビューID",
                value: review.externalReviewId,
                mono: true,
              },
              {
                label: "投稿者",
                value: review.author ?? "不明",
                mask: false,
              },
              {
                label: "本文",
                value: review.comment ?? "本文がありません。",
                mask: false,
                fullWidth: true,
              },
              {
                label: "返信状況",
                value: review.reply ? "返信済み" : "未返信",
                mask: false,
              },
            ]}
          >
            {isGoogle ? (
              <div className="space-y-2">
                {!params.canReply && !review.reply && (
                  <p className="text-sm text-slate-500">
                    返信は組織管理者のみ操作できます。
                  </p>
                )}
                <ReviewInboxReplyForm
                  locationId={review.locationId}
                  reviewId={review.id}
                  canEdit={params.canReply}
                  existingReply={review.reply}
                />
              </div>
            ) : (
              <Card tone="amber">
                <CardContent className="text-sm text-amber-100">
                  <p className="font-semibold">Metaの返信は未対応</p>
                  <p className="mt-1 text-amber-100/80">
                    現時点ではGoogleレビューのみ返信できます。
                  </p>
                </CardContent>
              </Card>
            )}
          </DetailsDisclosure>
        );
      },
      cellClassName: "min-w-[120px]",
      headerClassName: "whitespace-nowrap",
    },
  ];
}
