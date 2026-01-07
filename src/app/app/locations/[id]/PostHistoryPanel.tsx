"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { MediaItem } from "@/server/services/media";
import type { PostHistoryItem } from "@/server/services/post-history";
import { ProviderType } from "@/server/providers/types";

type SignedUrlState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

const statusLabels: Record<
  string,
  { label: string; variant: "success" | "warning" | "muted" }
> = {
    published: { label: "成功", variant: "success" },
    failed: { label: "失敗", variant: "warning" },
    queued: { label: "送信中", variant: "muted" },
    draft: { label: "下書き", variant: "muted" },
  };

const providerLabels: Record<string, string> = {
  [ProviderType.GoogleBusinessProfile]: "Google Business Profile",
  [ProviderType.Meta]: "Meta",
  [ProviderType.YahooPlace]: "Yahoo!プレイス",
  [ProviderType.AppleBusinessConnect]: "Apple Business Connect",
  [ProviderType.BingMaps]: "Bing Maps",
  [ProviderType.YahooYolp]: "Yahoo! MAP（YOLP）",
};

const targetLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

function extractTargetLabel(externalPostId?: string | null) {
  if (!externalPostId) return null;
  const prefix = externalPostId.split(":")[0];
  return targetLabels[prefix] ?? null;
}

function resolveNextAction(error: string | null | undefined) {
  if (!error) return "再実行してください。";
  if (error.includes("再認可") || error.includes("認証")) {
    return "再接続（再認可）を実行してください。";
  }
  if (error.includes("権限")) {
    return "必要な権限を追加して再実行してください。";
  }
  if (error.includes("レート") || error.includes("429")) {
    return "時間をおいて再実行してください。";
  }
  return "内容を確認して再実行してください。";
}

async function fetchSignedUrl(params: {
  locationId: string;
  ref: string;
}): Promise<string> {
  const query = new URLSearchParams({
    locationId: params.locationId,
    ref: params.ref,
  });
  const response = await fetch(`/api/media/signed-url?${query.toString()}`);
  const payload = (await response.json()) as {
    signedUrl?: string;
    error?: { cause?: string };
  };

  if (!response.ok || !payload.signedUrl) {
    const message =
      payload.error?.cause ?? "署名URLの取得に失敗しました。";
    throw new Error(message);
  }

  return payload.signedUrl;
}

export function PostHistoryPanel(props: {
  posts: PostHistoryItem[];
  locationId: string;
}) {
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [signedUrls, setSignedUrls] = useState<Record<string, SignedUrlState>>(
    {}
  );

  const filtered = useMemo(() => {
    return props.posts.filter((post) => {
      if (statusFilter !== "all" && post.status !== statusFilter) {
        return false;
      }
      if (providerFilter === "all") return true;
      return post.targets.some((target) => target.provider === providerFilter);
    });
  }, [props.posts, providerFilter, statusFilter]);

  const requestSignedUrl = async (ref: string) => {
    if (signedUrls[ref]?.status === "loading") return;
    setSignedUrls((prev) => ({ ...prev, [ref]: { status: "loading" } }));
    try {
      const url = await fetchSignedUrl({ locationId: props.locationId, ref });
      setSignedUrls((prev) => ({ ...prev, [ref]: { status: "ready", url } }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "署名URLの取得に失敗しました。";
      setSignedUrls((prev) => ({
        ...prev,
        [ref]: { status: "error", message },
      }));
    }
  };

  const renderMediaPreview = (media: MediaItem, key: string) => {
    if (media.source === "url") {
      return (
        <Image
          key={key}
          src={media.url}
          alt="投稿画像"
          width={180}
          height={120}
          loader={({ src }) => src}
          unoptimized
          className="h-24 w-36 rounded-md border border-slate-200 bg-white object-cover"
        />
      );
    }

    const ref = `storage://${media.bucket}/${media.path}`;
    const state = signedUrls[ref] ?? { status: "idle" };

    if (state.status === "ready") {
      return (
        <Image
          key={key}
          src={state.url}
          alt="投稿画像"
          width={180}
          height={120}
          loader={({ src }) => src}
          unoptimized
          className="h-24 w-36 rounded-md border border-slate-200 bg-white object-cover"
        />
      );
    }

    return (
      <div
        key={key}
        className="flex h-24 w-36 flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-500"
      >
        <span>
          {state.status === "loading" ? "プレビュー取得中" : "プレビュー未取得"}
        </span>
        {state.status === "error" && (
          <span className="mt-1 text-amber-600">{state.message}</span>
        )}
        <button
          type="button"
          onClick={() => requestSignedUrl(ref)}
          className="mt-1 text-[11px] text-slate-700 underline"
        >
          プレビュー取得
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">投稿履歴</h2>
          <p className="text-xs text-slate-500">
            投稿の状態と対象を確認できます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2"
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
          >
            <option value="all">すべてのプロバイダ</option>
            {Object.values(ProviderType).map((value) => (
              <option key={value} value={value}>
                {providerLabels[value] ?? value}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">すべての状態</option>
            <option value="published">成功</option>
            <option value="failed">失敗</option>
            <option value="queued">送信中</option>
            <option value="draft">下書き</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-500">
          投稿履歴がありません。
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const status = statusLabels[post.status] ?? {
              label: post.status,
              variant: "muted" as const,
            };
            return (
              <div
                key={post.id}
                className="rounded-md border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      作成日時: {formatDate(post.createdAt)}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {post.content.slice(0, 80)}
                      {post.content.length > 80 ? "…" : ""}
                    </p>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                <details className="mt-2 text-xs text-slate-500">
                  <summary className="cursor-pointer text-slate-700">
                    投稿本文を表示
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                    {post.content}
                  </p>
                </details>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      対象プロバイダ
                    </p>
                    <div className="mt-2 space-y-2">
                      {post.targets.length === 0 ? (
                        <p className="text-xs text-slate-500">対象なし</p>
                      ) : (
                        post.targets.map((target, index) => {
                          const targetLabel = extractTargetLabel(
                            target.externalPostId
                          );
                          const providerLabel =
                            providerLabels[target.provider] ?? target.provider;
                          const targetStatus =
                            statusLabels[target.status] ?? statusLabels.draft;
                          return (
                            <div
                              key={`${post.id}-${index}`}
                              className="rounded-md border border-slate-200 bg-slate-50 p-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-700">
                                  {providerLabel}
                                  {targetLabel ? ` / ${targetLabel}` : ""}
                                </p>
                                <Badge variant={targetStatus.variant}>
                                  {targetStatus.label}
                                </Badge>
                              </div>
                              {target.error && (
                                <div className="mt-2 text-[11px] text-amber-700">
                                  <p>原因: {target.error}</p>
                                  <p>
                                    次にやること: {resolveNextAction(target.error)}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">画像</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {post.media.length === 0 ? (
                        <p className="text-xs text-slate-500">画像なし</p>
                      ) : (
                        post.media.map((media, index) =>
                          renderMediaPreview(media, `${post.id}-${index}`)
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
