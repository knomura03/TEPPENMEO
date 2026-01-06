"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  linkMetaPageAction,
  publishMetaPostAction,
  unlinkMetaPageAction,
  type ActionState,
} from "@/server/actions/meta";

type UiError = {
  cause: string;
  nextAction: string;
};

type MetaPageOption = {
  id: string;
  name: string;
  instagram?: { id: string; username?: string | null } | null;
};

type MetaLinkInfo = {
  externalLocationId: string;
  metadata: Record<string, unknown>;
};

const initialState: ActionState = { error: null, success: null };

function ErrorBox({ error }: { error: UiError }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="font-semibold">原因</p>
      <p>{error.cause}</p>
      <p className="mt-2 font-semibold">次にやること</p>
      <p>{error.nextAction}</p>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      {message}
    </div>
  );
}

export function MetaPanel(props: {
  locationId: string;
  canEdit: boolean;
  connectionStatus: "connected" | "not_connected" | "reauth_required";
  connectionLabel: string;
  connectionMessage?: string | null;
  link: MetaLinkInfo | null;
  candidates: MetaPageOption[];
  candidatesError: UiError | null;
}) {
  const [selectedId, setSelectedId] = useState(
    props.link?.externalLocationId ?? props.candidates[0]?.id ?? ""
  );
  const selectedPage = useMemo(
    () => props.candidates.find((page) => page.id === selectedId),
    [props.candidates, selectedId]
  );

  const [linkState, linkAction] = useFormState(
    linkMetaPageAction,
    initialState
  );
  const [unlinkState, unlinkAction] = useFormState(
    unlinkMetaPageAction,
    initialState
  );
  const [postState, postAction] = useFormState(
    publishMetaPostAction,
    initialState
  );

  const isConnected = props.connectionStatus === "connected";
  const needsReauth = props.connectionStatus === "reauth_required";
  const instagramId =
    typeof props.link?.metadata?.instagram_business_account_id === "string"
      ? (props.link.metadata.instagram_business_account_id as string)
      : null;
  const instagramUsername =
    typeof props.link?.metadata?.instagram_username === "string"
      ? (props.link.metadata.instagram_username as string)
      : null;

  const linkDisabledReason = !props.canEdit
    ? "権限がありません。"
    : !isConnected
    ? "Metaが未接続です。"
    : props.candidates.length === 0
    ? "ページ候補がありません。"
    : null;

  const canPost = props.canEdit && isConnected && Boolean(props.link);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Meta（Facebook/Instagram）
          </p>
          <p className="text-xs text-slate-500">
            接続状態: {props.connectionLabel}
          </p>
        </div>
      </div>

      {needsReauth && (
        <ErrorBox
          error={{
            cause: "再認可が必要です。",
            nextAction: "Metaを再接続してください。",
          }}
        />
      )}

      {props.connectionMessage && !needsReauth && (
        <p className="text-xs text-amber-700">{props.connectionMessage}</p>
      )}

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-700">
          Facebookページ紐付け
        </p>
        <p className="text-xs text-slate-500">
          管理するFacebookページをこのロケーションに紐付けます。
        </p>

        {props.candidatesError && (
          <div className="mt-3">
            <ErrorBox error={props.candidatesError} />
          </div>
        )}

        {props.link && (
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-900">
              現在の紐付け:{" "}
              {typeof props.link.metadata.page_name === "string"
                ? props.link.metadata.page_name
                : "未設定"}
            </p>
            <p className="text-[11px] text-slate-500">
              Instagram:{" "}
              {instagramId
                ? instagramUsername ?? instagramId
                : "未連携"}
            </p>
          </div>
        )}

        <form action={linkAction} className="mt-3 space-y-3">
          <input type="hidden" name="locationId" value={props.locationId} />
          <input
            type="hidden"
            name="pageId"
            value={selectedPage?.id ?? ""}
          />
          <input
            type="hidden"
            name="pageName"
            value={selectedPage?.name ?? ""}
          />
          <input
            type="hidden"
            name="instagramId"
            value={selectedPage?.instagram?.id ?? ""}
          />
          <input
            type="hidden"
            name="instagramUsername"
            value={selectedPage?.instagram?.username ?? ""}
          />
          <Select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={!props.canEdit || !isConnected || props.candidates.length === 0}
          >
            {props.candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
          {linkDisabledReason && (
            <p className="text-xs text-slate-500">{linkDisabledReason}</p>
          )}
          {linkState.error && <ErrorBox error={linkState.error} />}
          {linkState.success && <SuccessBox message={linkState.success} />}
          <Button
            type="submit"
            className="w-full"
            disabled={!props.canEdit || !isConnected || props.candidates.length === 0}
          >
            紐付けを更新
          </Button>
        </form>

        {props.link && (
          <form action={unlinkAction} className="mt-3 space-y-2">
            <input type="hidden" name="locationId" value={props.locationId} />
            {unlinkState.error && <ErrorBox error={unlinkState.error} />}
            {unlinkState.success && <SuccessBox message={unlinkState.success} />}
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={!props.canEdit}
            >
              紐付けを解除
            </Button>
          </form>
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-700">投稿作成</p>
        <p className="text-xs text-slate-500">
          Facebookは本文必須。Instagramは画像URL必須です。
        </p>
        {!props.link && (
          <p className="mt-2 text-xs text-slate-500">
            投稿するにはFacebookページを紐付けてください。
          </p>
        )}
        <form action={postAction} className="mt-3 space-y-3">
          <input type="hidden" name="locationId" value={props.locationId} />
          <textarea
            name="content"
            rows={4}
            placeholder="投稿本文を入力"
            className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            disabled={!canPost}
          />
          <input
            name="imageUrl"
            placeholder="画像URL（任意・Instagram投稿時は必須）"
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            disabled={!canPost}
          />
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="publishFacebook"
                defaultChecked
                disabled={!canPost}
              />
              Facebookに投稿
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="publishInstagram"
                disabled={!canPost || !instagramId}
              />
              Instagramに投稿
            </label>
            {!instagramId && (
              <span className="text-[11px] text-slate-500">
                Instagram連携が未検出です
              </span>
            )}
          </div>
          {postState.error && <ErrorBox error={postState.error} />}
          {postState.success && <SuccessBox message={postState.success} />}
          <Button type="submit" className="w-full" disabled={!canPost}>
            投稿を送信
          </Button>
        </form>
      </div>
    </div>
  );
}
