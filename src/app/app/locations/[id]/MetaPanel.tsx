"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { useFormState } from "react-dom";

import { Button, buttonStyles } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

type TemplateTargets = {
  facebook?: boolean;
  instagram?: boolean;
  google?: boolean;
};

type PostTemplateOption = {
  id: string;
  name: string;
  body: string;
  defaultTargets?: TemplateTargets | null;
};

type UploadResult = {
  bucket: string;
  path: string;
  previewUrl: string;
  mime?: string | null;
  size?: number | null;
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; result: UploadResult }
  | { status: "error"; error: UiError };

const initialState: ActionState = { error: null, success: null };
const defaultTargets: Required<TemplateTargets> = {
  facebook: true,
  instagram: false,
  google: false,
};

function ErrorBox({ error }: { error: UiError }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">原因</p>
      <p>{error.cause}</p>
      <p className="mt-2 font-semibold">次にやること</p>
      <p>{error.nextAction}</p>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      {message}
    </div>
  );
}

export function MetaPanel(props: {
  locationId: string;
  canEdit: boolean;
  maxUploadMb: number;
  connectionStatus: "connected" | "not_connected" | "reauth_required";
  connectionLabel: string;
  connectionMessage?: string | null;
  link: MetaLinkInfo | null;
  googleConnectionStatus: "connected" | "not_connected" | "reauth_required";
  googleLink: { externalLocationId: string; metadata: Record<string, unknown> } | null;
  candidates: MetaPageOption[];
  candidatesError: UiError | null;
  templates: PostTemplateOption[];
  templatesNotice?: string | null;
  composerDefaultOpen?: boolean;
}) {
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [selectedId, setSelectedId] = useState(
    props.link?.externalLocationId ?? props.candidates[0]?.id ?? ""
  );
  const selectedPage = useMemo(
    () => props.candidates.find((page) => page.id === selectedId),
    [props.candidates, selectedId]
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [content, setContent] = useState("");
  const [targets, setTargets] = useState(defaultTargets);
  const templatesMap = useMemo(
    () => new Map(props.templates.map((template) => [template.id, template])),
    [props.templates]
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
    ? "管理者のみ操作できます。"
    : !isConnected
    ? "Facebook/Instagramの連携が必要です。"
    : props.candidates.length === 0
    ? "選べるページがありません。"
    : null;

  const canPostMeta = props.canEdit && isConnected && Boolean(props.link);
  const canPostGoogle =
    props.canEdit &&
    props.googleConnectionStatus === "connected" &&
    Boolean(props.googleLink);
  const canPostAny = canPostMeta || canPostGoogle;

  const metaDisabledReason = !props.canEdit
    ? "管理者のみ操作できます。"
    : !isConnected
    ? "Facebook/Instagramの連携が必要です。"
    : !props.link
    ? "Facebookページが選ばれていません。"
    : null;

  const googleDisabledReason = !props.canEdit
    ? "管理者のみ操作できます。"
    : props.googleConnectionStatus === "reauth_required"
    ? "つなぎ直しが必要です。"
    : props.googleConnectionStatus !== "connected"
    ? "Googleの連携が必要です。"
    : !props.googleLink
    ? "Googleの店舗情報が未設定です。"
    : null;

  const applyTemplate = (template: PostTemplateOption | null) => {
    if (!template) return;
    setContent(template.body);
    const mergedTargets = {
      ...defaultTargets,
      ...(template.defaultTargets ?? {}),
    };
    setTargets({
      facebook: Boolean(mergedTargets.facebook),
      instagram: Boolean(mergedTargets.instagram),
      google: Boolean(mergedTargets.google),
    });
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplateId(value);
    const template = value ? templatesMap.get(value) ?? null : null;
    applyTemplate(template);
  };

  const handleTargetChange =
    (key: keyof TemplateTargets) => (event: ChangeEvent<HTMLInputElement>) => {
      setTargets((prev) => ({
        ...prev,
        [key]: event.target.checked,
      }));
    };

  const uploadImage = async () => {
    if (!selectedFile) {
      setUploadState({
        status: "error",
        error: {
          cause: "画像ファイルが選択されていません。",
          nextAction: "画像ファイルを選択してください。",
        },
      });
      return;
    }

    setUploadState({ status: "uploading" });

    try {
      const formData = new FormData();
      formData.append("locationId", props.locationId);
      formData.append("file", selectedFile);
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | UploadResult
        | { error?: UiError };

      if (!response.ok) {
        const error = (payload as { error?: UiError }).error ?? {
          cause: "アップロードに失敗しました。",
          nextAction: "時間をおいて再実行してください。",
        };
        setUploadState({ status: "error", error });
        return;
      }

      setUploadState({ status: "success", result: payload as UploadResult });
    } catch {
      setUploadState({
        status: "error",
        error: {
          cause: "アップロードに失敗しました。",
          nextAction: "時間をおいて再実行してください。",
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Facebook/Instagram
          </p>
          <p className="text-sm text-slate-500">
            連携状態: {props.connectionLabel}
          </p>
        </div>
      </div>

      {needsReauth && (
        <ErrorBox
          error={{
            cause: "つなぎ直しが必要です。",
            nextAction: "Facebook/Instagramをつなぎ直してください。",
          }}
        />
      )}

      {props.connectionMessage && !needsReauth && (
        <p className="text-sm text-amber-700">{props.connectionMessage}</p>
      )}

      <div
        id="meta-link"
        className="rounded-md border border-slate-200 bg-slate-50 p-4"
      >
        <p className="text-sm font-semibold text-slate-700">
          Facebookページを選ぶ
        </p>
        <p className="text-sm text-slate-500">
          管理しているページを選び、この店舗とつなぎます。
        </p>

        {props.candidatesError && (
          <div className="mt-3">
            <ErrorBox error={props.candidatesError} />
          </div>
        )}

        {props.link && (
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">
              現在のつなぎ先:{" "}
              {typeof props.link.metadata.page_name === "string"
                ? props.link.metadata.page_name
                : "未選択"}
            </p>
            <p className="text-sm text-slate-500">
              Instagram:{" "}
              {instagramId
                ? instagramUsername ?? instagramId
                : "未設定"}
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
          <FormField label="Facebookページ" required>
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
          </FormField>
          {linkDisabledReason && (
            <p className="text-sm text-slate-500">{linkDisabledReason}</p>
          )}
          {linkState.error && <ErrorBox error={linkState.error} />}
          {linkState.success && <SuccessBox message={linkState.success} />}
          <Button
            type="submit"
            className="w-full"
            disabled={!props.canEdit || !isConnected || props.candidates.length === 0}
          >
            この店舗とつなぐ
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
              つなぎを解除
            </Button>
          </form>
        )}
      </div>

      <details
        id="post-compose"
        open={props.composerDefaultOpen ?? true}
        className="rounded-md border border-slate-200 bg-slate-50 p-4"
      >
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
          投稿する
        </summary>
        <div className="mt-3 space-y-4">
          <p className="text-sm text-slate-500">
            テンプレ → 本文 → 投稿先 → 送信の順で進めます。
          </p>
          {props.templatesNotice && (
            <p className="text-sm text-amber-700">{props.templatesNotice}</p>
          )}
          {!props.link && (
            <p className="text-sm text-slate-500">
              投稿するにはFacebookページを選んでください。
            </p>
          )}
          <form action={postAction} className="space-y-4">
            <input type="hidden" name="locationId" value={props.locationId} />
            <input
              type="hidden"
              name="imagePath"
              value={
                imageMode === "upload" && uploadState.status === "success"
                  ? uploadState.result.path
                  : ""
              }
            />
            <FormField label="テンプレを選ぶ">
              <Select
                value={selectedTemplateId}
                onChange={(event) => handleTemplateChange(event.target.value)}
                disabled={!canPostAny}
              >
                <option value="">テンプレなし</option>
                {props.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>テンプレを選ぶと本文と投稿先が入ります。</span>
              <Link
                href="/app/post-templates"
                className={buttonStyles({ variant: "link", size: "sm" })}
              >
                テンプレを管理
              </Link>
            </div>
            <FormField label="投稿内容" required>
              <Textarea
                name="content"
                rows={4}
                placeholder="投稿内容を入力"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                disabled={!canPostAny}
              />
            </FormField>
            <FormField label="投稿先">
              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="publishFacebook"
                    checked={targets.facebook}
                    onChange={handleTargetChange("facebook")}
                    disabled={!canPostMeta}
                  />
                  Facebookに投稿
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="publishInstagram"
                    checked={targets.instagram}
                    onChange={handleTargetChange("instagram")}
                    disabled={!canPostMeta || !instagramId}
                  />
                  Instagramに投稿
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="publishGoogle"
                    checked={targets.google}
                    onChange={handleTargetChange("google")}
                    disabled={!canPostGoogle}
                  />
                  Googleに投稿
                </label>
              </div>
            </FormField>
            <p className="text-xs text-slate-500">
              Instagramに投稿する場合は画像が必要です。
            </p>
            {!instagramId && (
              <span className="text-xs text-slate-500">
                Instagram連携が未設定です
              </span>
            )}
            {metaDisabledReason && (
              <span className="text-xs text-slate-500">{metaDisabledReason}</span>
            )}
            {googleDisabledReason && (
              <span className="text-xs text-slate-500">{googleDisabledReason}</span>
            )}
            <details className="rounded-md border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                画像の準備（任意）
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="imageMode"
                      value="url"
                      checked={imageMode === "url"}
                      onChange={() => setImageMode("url")}
                      disabled={!canPostAny}
                    />
                    URL入力
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="imageMode"
                      value="upload"
                      checked={imageMode === "upload"}
                      onChange={() => setImageMode("upload")}
                      disabled={!canPostAny}
                    />
                    ファイルアップロード
                  </label>
                </div>
                {imageMode === "url" && (
                  <FormField label="画像URL">
                    <Input
                      name="imageUrl"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      placeholder="画像URL（任意・Instagram投稿時は必須）"
                      disabled={!canPostAny}
                    />
                  </FormField>
                )}
                {imageMode === "upload" && (
                  <div className="space-y-2">
                    <FormField label="画像ファイル">
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setSelectedFile(file);
                          if (file) {
                            setUploadState({ status: "idle" });
                          }
                        }}
                        disabled={!canPostAny}
                      />
                    </FormField>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>PNG/JPEG/WebP/GIF</span>
                      <span>最大{props.maxUploadMb}MB</span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={uploadImage}
                      disabled={!canPostAny || uploadState.status === "uploading"}
                    >
                      {uploadState.status === "uploading"
                        ? "アップロード中..."
                        : "画像をアップロード"}
                    </Button>
                    {uploadState.status === "error" && (
                      <ErrorBox error={uploadState.error} />
                    )}
                    {uploadState.status === "success" && (
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                        <p className="font-semibold text-slate-800">
                          アップロード済み
                        </p>
                        <Image
                          src={uploadState.result.previewUrl}
                          alt="アップロード画像"
                          width={320}
                          height={180}
                          loader={({ src }) => src}
                          unoptimized
                          className="mt-2 h-32 w-auto rounded-md border border-slate-200 bg-white object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
            {postState.error && <ErrorBox error={postState.error} />}
            {postState.success && <SuccessBox message={postState.success} />}
            <Button type="submit" className="w-full" disabled={!canPostAny}>
              投稿する
            </Button>
          </form>
        </div>
      </details>
    </div>
  );
}
