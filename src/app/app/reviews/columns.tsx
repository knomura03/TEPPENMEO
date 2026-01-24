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

function formatRating(provider: ProviderType, value: number | null) {
  if (provider === ProviderType.Meta) return "コメント";
  if (value === null || Number.isNaN(value)) return "-";
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

function providerLabel(review: ReviewInboxItem) {
  if (review.provider === ProviderType.GoogleBusinessProfile) return "Google口コミ";
  if (review.provider === ProviderType.Meta) {
    if (review.channel === "facebook") return "Facebookコメント";
    if (review.channel === "instagram") return "Instagramコメント";
    return "SNSコメント";
  }
  return "未対応";
}

export function createReviewColumns(params: {
  canReply: boolean;
}): ColumnDef<ReviewInboxItem>[] {
  return [
    {
      header: "日時",
      cell: (review) => formatDate(review.createdAt),
      cellClassName:
        "whitespace-nowrap font-mono text-xs text-[color:var(--text-muted)]",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "店舗",
      cell: (review) => review.locationName,
      cellClassName: "min-w-[160px]",
    },
    {
      header: "連携サービス",
      cell: (review) => (
        <Badge variant="muted">{providerLabel(review)}</Badge>
      ),
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "評価",
      cell: (review) =>
        review.provider === ProviderType.Meta
          ? "コメント"
          : `★ ${formatRating(review.provider, review.rating)}`,
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "本文",
      cell: (review) => (
        <p className="line-clamp-2 whitespace-pre-wrap text-sm text-[color:var(--text-default)]">
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
          店舗詳細へ
        </Link>
      ),
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "詳細",
      cell: (review) => {
        const canReplyProvider =
          review.provider === ProviderType.GoogleBusinessProfile ||
          review.provider === ProviderType.Meta;
        const unknownChannel =
          review.provider === ProviderType.Meta && !review.channel;
        return (
          <DetailsDisclosure
            items={[
              {
                label: "口コミ・コメントID",
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
            <div className="space-y-2">
              {!canReplyProvider && (
                <Card tone="amber">
                  <CardContent className="text-sm text-amber-900">
                    <p className="font-semibold">このコメントは準備中です</p>
                    <p className="mt-1">
                      現在はGoogle口コミとSNSコメントに対応しています。
                    </p>
                  </CardContent>
                </Card>
              )}
              {unknownChannel && (
                <Card tone="amber">
                  <CardContent className="text-sm text-amber-900">
                    <p className="font-semibold">コメントの種類が不明です</p>
                    <p className="mt-1">
                      連携設定を確認し、再読み込みしてください。
                    </p>
                  </CardContent>
                </Card>
              )}
              {!params.canReply && !review.reply && (
                <p className="text-sm text-[color:var(--text-muted)]">
                  返信は管理者のみ操作できます。
                </p>
              )}
              {canReplyProvider && !unknownChannel && (
                <ReviewInboxReplyForm
                  locationId={review.locationId}
                  reviewId={review.id}
                  canEdit={params.canReply}
                  existingReply={review.reply}
                />
              )}
            </div>
          </DetailsDisclosure>
        );
      },
      cellClassName: "min-w-[120px]",
      headerClassName: "whitespace-nowrap",
    },
  ];
}
