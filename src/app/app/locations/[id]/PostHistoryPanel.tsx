"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { MediaItem } from "@/server/services/media";
import type {
  PostHistoryItem,
  PostHistoryPage,
  PostHistoryStatus,
  PostHistoryTarget,
} from "@/server/services/post-history";
import { ProviderType } from "@/server/providers/types";

type SignedUrlState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

type RetryState =
  | { status: "idle" }
  | { status: "loading" }
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

const targetLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
};

const statusOptions: Array<{ value: PostHistoryStatus; label: string }> = [
  { value: "all", label: "すべての状態" },
  { value: "published", label: "成功" },
  { value: "failed", label: "失敗" },
  { value: "queued", label: "送信中" },
];

const targetOptions: Array<{ value: PostHistoryTarget; label: string }> = [
  { value: "all", label: "すべての対象" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
];

const idleRetryState: RetryState = { status: "idle" };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

function extractTargetKey(target: PostHistoryItem["targets"][number]) {
  if (target.provider === ProviderType.GoogleBusinessProfile) return "google";
  if (!target.externalPostId) return null;
  const prefix = target.externalPostId.split(":")[0];
  if (prefix === "facebook" || prefix === "instagram") {
    return prefix;
  }
  return null;
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

function derivePostStatus(targets: PostHistoryItem["targets"], fallback: string) {
  if (targets.length === 0) return fallback;
  if (targets.every((target) => target.status === "published")) return "published";
  if (targets.some((target) => target.status === "failed")) return "failed";
  return "queued";
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
    const message = payload.error?.cause ?? "署名URLの取得に失敗しました。";
    throw new Error(message);
  }

  return payload.signedUrl;
}

async function fetchPostHistory(params: {
  locationId: string;
  page: number;
  pageSize: number;
  status: PostHistoryStatus;
  target: PostHistoryTarget;
  search: string;
}) {
  const query = new URLSearchParams({
    locationId: params.locationId,
    page: String(params.page),
    pageSize: String(params.pageSize),
    status: params.status,
    target: params.target,
    search: params.search,
  });

  const response = await fetch(`/api/posts/history?${query.toString()}`);
  const payload = (await response.json()) as
    | PostHistoryPage
    | { error?: { cause?: string } };

  if (!response.ok) {
    const message =
      (payload as { error?: { cause?: string } }).error?.cause ??
      "投稿履歴の取得に失敗しました。";
    throw new Error(message);
  }

  return payload as PostHistoryPage;
}

async function retryPostTarget(params: {
  postId: string;
  target: "facebook" | "instagram" | "google";
  locationId: string;
}) {
  const response = await fetch("/api/posts/retry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const payload = (await response.json()) as
    | { status?: "published" | "failed"; externalPostId?: string | null }
    | { error?: { cause?: string; nextAction?: string } };

  if (!response.ok) {
    const message =
      (payload as { error?: { cause?: string } }).error?.cause ??
      "再実行に失敗しました。";
    throw new Error(message);
  }

  return payload as { status: "published" | "failed"; externalPostId?: string | null };
}

export function PostHistoryPanel(props: {
  initialPage: PostHistoryPage;
  locationId: string;
  canEdit: boolean;
  isMockMode: boolean;
  metaConnectionStatus: "connected" | "not_connected" | "reauth_required";
  googleConnectionStatus: "connected" | "not_connected" | "reauth_required";
  googleLinked: boolean;
}) {
  const [posts, setPosts] = useState<PostHistoryItem[]>(props.initialPage.items);
  const [total, setTotal] = useState(props.initialPage.total);
  const [page, setPage] = useState(props.initialPage.page);
  const [pageSize] = useState(props.initialPage.pageSize);
  const [filters, setFilters] = useState(props.initialPage.filters);
  const [searchInput, setSearchInput] = useState(props.initialPage.filters.search);
  const [statusDraft, setStatusDraft] = useState(props.initialPage.filters.status);
  const [targetDraft, setTargetDraft] = useState(props.initialPage.filters.target);
  const [signedUrls, setSignedUrls] = useState<Record<string, SignedUrlState>>({});
  const [retryState, setRetryState] = useState<Record<string, RetryState>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const queryKey = `${page}-${pageSize}-${filters.status}-${filters.target}-${filters.search}`;
  const initialKeyRef = useRef(queryKey);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;

  useEffect(() => {
    if (initialKeyRef.current === queryKey) {
      initialKeyRef.current = "";
      return;
    }

    let isActive = true;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchPostHistory({
          locationId: props.locationId,
          page,
          pageSize,
          status: filters.status,
          target: filters.target,
          search: filters.search,
        });
        if (!isActive) return;
        setPosts(data.items);
        setTotal(data.total);
      } catch (error) {
        if (!isActive) return;
        const message =
          error instanceof Error
            ? error.message
            : "投稿履歴の取得に失敗しました。";
        setErrorMessage(message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, [filters, page, pageSize, props.locationId, queryKey]);

  const applyFilters = () => {
    setFilters({
      status: statusDraft,
      target: targetDraft,
      search: searchInput.trim(),
    });
    setPage(1);
  };

  const clearFilters = () => {
    setStatusDraft("all");
    setTargetDraft("all");
    setSearchInput("");
    setFilters({ status: "all", target: "all", search: "" });
    setPage(1);
  };

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

  const handleRetry = async (
    postId: string,
    target: "facebook" | "instagram" | "google"
  ) => {
    const key = `${postId}:${target}`;
    setRetryState((prev) => ({ ...prev, [key]: { status: "loading" } }));

    try {
      const result = await retryPostTarget({
        postId,
        target,
        locationId: props.locationId,
      });

      if (props.isMockMode) {
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id !== postId) return post;
            const nextTargets = post.targets.map((item) => {
              const itemTarget = extractTargetKey(item);
              if (itemTarget !== target) return item;
              return {
                ...item,
                status: result.status,
                error: null,
                externalPostId: result.externalPostId ?? item.externalPostId,
              };
            });
            return {
              ...post,
              status: derivePostStatus(nextTargets, post.status),
              targets: nextTargets,
            };
          })
        );
      } else {
        const data = await fetchPostHistory({
          locationId: props.locationId,
          page,
          pageSize,
          status: filters.status,
          target: filters.target,
          search: filters.search,
        });
        setPosts(data.items);
        setTotal(data.total);
      }

      setRetryState((prev) => ({ ...prev, [key]: { status: "idle" } }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "再実行に失敗しました。";
      setRetryState((prev) => ({
        ...prev,
        [key]: { status: "error", message },
      }));
    }
  };

  const activeChips = useMemo(() => {
    const chips: string[] = [];
    if (filters.search) chips.push(`検索: ${filters.search}`);
    if (filters.status !== "all") {
      const label = statusOptions.find((item) => item.value === filters.status)?.label;
      if (label) chips.push(`状態: ${label}`);
    }
    if (filters.target !== "all") {
      const label = targetLabels[filters.target] ?? filters.target;
      chips.push(`対象: ${label}`);
    }
    return chips;
  }, [filters]);

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
        className="flex h-24 w-36 flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-500"
      >
        <span>{state.status === "loading" ? "プレビュー取得中" : "プレビュー未取得"}</span>
        {state.status === "error" && (
          <span className="mt-1 text-amber-600">{state.message}</span>
        )}
        <button
          type="button"
          onClick={() => requestSignedUrl(ref)}
          className={buttonStyles({ variant: "link", size: "sm", className: "mt-1 px-0" })}
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
          <p className="text-sm text-slate-500">
            検索・フィルタ・ページ送りで投稿を探せます。
          </p>
        </div>
      </div>

      <Card tone="light">
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="本文検索">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="本文の一部"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyFilters();
                  }
                }}
              />
            </FormField>
            <FormField label="状態">
              <Select
                value={statusDraft}
                onChange={(event) =>
                  setStatusDraft(event.target.value as PostHistoryStatus)
                }
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="対象">
              <Select
                value={targetDraft}
                onChange={(event) =>
                  setTargetDraft(event.target.value as PostHistoryTarget)
                }
              >
                {targetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={applyFilters} disabled={isLoading}>
              適用
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={clearFilters}
              disabled={isLoading}
            >
              クリア
            </Button>
            <div className="ml-auto text-sm text-slate-500">
              全{total}件 / {page} / {totalPages}
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <Badge key={chip} variant="muted">
                  {chip}
                </Badge>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {posts.length === 0 && !isLoading ? (
        <Card tone="light">
          <CardContent className="text-sm text-slate-500">
            投稿履歴がありません。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const status = statusLabels[post.status] ?? {
              label: post.status,
              variant: "muted" as const,
            };
            return (
              <Card key={post.id} tone="light">
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-slate-500">
                        作成日時: {formatDate(post.createdAt)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {post.content.slice(0, 80)}
                        {post.content.length > 80 ? "…" : ""}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <details className="text-sm text-slate-500">
                    <summary className="cursor-pointer text-slate-700">
                      投稿本文を表示
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">
                      {post.content}
                    </p>
                  </details>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        連携サービス
                      </p>
                      <div className="mt-2 space-y-2">
                        {post.targets.length === 0 ? (
                          <p className="text-sm text-slate-500">対象なし</p>
                        ) : (
                          post.targets.map((target, index) => {
                            const targetKey = extractTargetKey(target);
                            const targetLabel = targetKey
                              ? targetLabels[targetKey]
                              : null;
                            const providerLabel =
                              target.provider === ProviderType.Meta
                                ? "Facebook/Instagram"
                                : target.provider ===
                                  ProviderType.GoogleBusinessProfile
                                ? "Google ビジネス プロフィール"
                                : target.provider;
                            const targetStatus =
                              statusLabels[target.status] ?? statusLabels.draft;
                            const retryKey = targetKey
                              ? `${post.id}:${targetKey}`
                              : null;
                            const retryStatus = retryKey
                              ? retryState[retryKey] ?? idleRetryState
                              : idleRetryState;
                            const isMetaTarget =
                              targetKey === "facebook" || targetKey === "instagram";
                            const isGoogleTarget = targetKey === "google";
                            const canRetryTarget =
                              props.canEdit &&
                              target.status === "failed" &&
                              (props.isMockMode ||
                                (isMetaTarget &&
                                  props.metaConnectionStatus === "connected") ||
                                (isGoogleTarget &&
                                  props.googleConnectionStatus === "connected" &&
                                  props.googleLinked));
                            const retryBlockedReason = props.isMockMode
                              ? null
                              : isMetaTarget
                              ? props.metaConnectionStatus === "reauth_required"
                                ? "再認可が必要です"
                                : props.metaConnectionStatus !== "connected"
                                ? "未接続のため再実行できません"
                                : null
                              : isGoogleTarget
                              ? !props.googleLinked
                                ? "Google店舗（GBP）が未紐付けです"
                                : props.googleConnectionStatus === "reauth_required"
                                ? "再認可が必要です"
                                : props.googleConnectionStatus !== "connected"
                                ? "未接続のため再実行できません"
                                : null
                              : null;

                            return (
                              <div
                                key={`${post.id}-${index}`}
                                className="rounded-md border border-slate-200 bg-slate-50 p-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-700">
                                    {providerLabel}
                                    {targetLabel ? ` / ${targetLabel}` : ""}
                                  </p>
                                  <Badge variant={targetStatus.variant}>
                                    {targetStatus.label}
                                  </Badge>
                                </div>
                                {target.error && (
                                  <div className="mt-2 text-sm text-amber-700">
                                    <p>原因: {target.error}</p>
                                    <p>
                                      次にやること: {resolveNextAction(target.error)}
                                    </p>
                                  </div>
                                )}
                                {target.status === "failed" && targetKey && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      disabled={
                                        !canRetryTarget ||
                                        retryStatus.status === "loading"
                                      }
                                      onClick={() =>
                                        handleRetry(
                                          post.id,
                                          targetKey as "facebook" | "instagram" | "google"
                                        )
                                      }
                                    >
                                      {retryStatus.status === "loading"
                                        ? "再実行中..."
                                        : "再実行"}
                                    </Button>
                                    {retryBlockedReason && (
                                      <span className="text-amber-700">
                                        {retryBlockedReason}
                                      </span>
                                    )}
                                    {retryStatus.status === "error" && (
                                      <span className="text-amber-700">
                                        {retryStatus.message}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">画像</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {post.media.length === 0 ? (
                          <p className="text-sm text-slate-500">画像なし</p>
                        ) : (
                          post.media.map((media, index) =>
                            renderMediaPreview(media, `${post.id}-${index}`)
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>
          {total}件中 {posts.length}件を表示
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!hasPrev || isLoading}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            前へ
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!hasNext || isLoading}
            onClick={() => setPage((prev) => prev + 1)}
          >
            次へ
          </Button>
        </div>
      </div>
    </div>
  );
}
