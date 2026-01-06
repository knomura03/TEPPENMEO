"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  linkGoogleLocationAction,
  syncGoogleReviewsAction,
  type ActionState,
} from "@/server/actions/google-business-profile";

type UiError = {
  cause: string;
  nextAction: string;
};

type GoogleLocationOption = {
  id: string;
  name: string;
  address?: string | null;
  metadata?: Record<string, unknown>;
};

type GoogleLinkInfo = {
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

export function GoogleGbpPanel(props: {
  locationId: string;
  canEdit: boolean;
  connectionLabel: string;
  connectionMessage?: string | null;
  apiAccessWarning?: string | null;
  link: GoogleLinkInfo | null;
  candidates: GoogleLocationOption[];
  candidatesError: UiError | null;
  lastSyncAt: string | null;
}) {
  const [selectedId, setSelectedId] = useState(
    props.link?.externalLocationId ?? props.candidates[0]?.id ?? ""
  );
  const selectedLocation = useMemo(
    () => props.candidates.find((loc) => loc.id === selectedId),
    [props.candidates, selectedId]
  );

  const [linkState, linkAction] = useFormState(
    linkGoogleLocationAction,
    initialState
  );
  const [syncState, syncAction] = useFormState(
    syncGoogleReviewsAction,
    initialState
  );
  const linkedName =
    typeof props.link?.metadata?.location_name === "string"
      ? props.link.metadata.location_name
      : "未設定";
  const linkedAccount =
    typeof props.link?.metadata?.account_name === "string"
      ? props.link.metadata.account_name
      : "不明";

  const linkDisabledReason = !props.canEdit
    ? "権限がありません。"
    : props.candidates.length === 0
    ? "ロケーション候補がありません。"
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Google ビジネス プロフィール
          </p>
          <p className="text-xs text-slate-500">
            接続状態: {props.connectionLabel}
          </p>
        </div>
        {props.lastSyncAt && (
          <p className="text-xs text-slate-500">
            最終同期: {props.lastSyncAt}
          </p>
        )}
      </div>

      {props.apiAccessWarning && (
        <ErrorBox
          error={{
            cause: props.apiAccessWarning,
            nextAction: "API承認が完了したら再接続してください。",
          }}
        />
      )}

      {props.connectionMessage && !props.apiAccessWarning && (
        <p className="text-xs text-amber-700">{props.connectionMessage}</p>
      )}

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-700">ロケーション紐付け</p>
        <p className="text-xs text-slate-500">
          GBP側のロケーションをこのロケーションに紐付けます。
        </p>

        {props.candidatesError && (
          <div className="mt-3">
            <ErrorBox error={props.candidatesError} />
          </div>
        )}

        {props.link && (
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-900">
              現在の紐付け: {linkedName}
            </p>
            <p className="text-[11px] text-slate-500">
              アカウント: {linkedAccount}
            </p>
          </div>
        )}

        <form action={linkAction} className="mt-3 space-y-3">
          <input type="hidden" name="locationId" value={props.locationId} />
          <input
            type="hidden"
            name="externalLocationId"
            value={selectedLocation?.id ?? ""}
          />
          <input
            type="hidden"
            name="displayName"
            value={selectedLocation?.name ?? ""}
          />
          <input
            type="hidden"
            name="accountName"
            value={(selectedLocation?.metadata?.account_name as string) ?? ""}
          />
          <input
            type="hidden"
            name="address"
            value={selectedLocation?.address ?? ""}
          />
          <Select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={!props.canEdit || props.candidates.length === 0}
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
            disabled={!props.canEdit || props.candidates.length === 0}
          >
            紐付けを更新
          </Button>
        </form>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-700">レビュー同期</p>
        <p className="text-xs text-slate-500">
          紐付け済みロケーションのレビューを同期します。
        </p>
        <form action={syncAction} className="mt-3 space-y-3">
          <input type="hidden" name="locationId" value={props.locationId} />
          {syncState.error && <ErrorBox error={syncState.error} />}
          {syncState.success && <SuccessBox message={syncState.success} />}
          <Button type="submit" className="w-full" disabled={!props.canEdit}>
            レビュー同期
          </Button>
        </form>
      </div>
    </div>
  );
}
