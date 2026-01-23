"use client";

import { useFormState } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/Callout";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  archivePostTemplateAction,
  createPostTemplateAction,
  updatePostTemplateAction,
  type TemplateActionState,
} from "@/server/actions/post-templates";

type TemplateTargets = {
  facebook?: boolean;
  instagram?: boolean;
  google?: boolean;
};

type PostTemplate = {
  id: string;
  name: string;
  body: string;
  defaultTargets: TemplateTargets;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

const initialState: TemplateActionState = { error: null, success: null };

function formatTargets(targets: TemplateTargets) {
  const labels: string[] = [];
  if (targets.facebook) labels.push("Facebook");
  if (targets.instagram) labels.push("Instagram");
  if (targets.google) labels.push("Google");
  return labels.length > 0 ? labels.join(" / ") : "未選択";
}

function previewBody(body: string) {
  const trimmed = body.trim();
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 80)}…`;
}

function TemplateItem({
  template,
  canEdit,
}: {
  template: PostTemplate;
  canEdit: boolean;
}) {
  const [updateState, updateAction] = useFormState(
    updatePostTemplateAction,
    initialState
  );
  const [archiveState, archiveAction] = useFormState(
    archivePostTemplateAction,
    initialState
  );

  return (
    <details className="rounded-md border border-slate-200 bg-white p-4">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{template.name}</p>
          <p className="text-xs text-slate-500">
            投稿先: {formatTargets(template.defaultTargets)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {previewBody(template.body)}
          </p>
        </div>
        <span className="text-sm text-[color:var(--primary)]">編集</span>
      </summary>
      <div className="mt-4 space-y-4">
        <form action={updateAction} className="space-y-3">
          <input type="hidden" name="id" value={template.id} />
          <FormField label="テンプレ名" required>
            <Input name="name" defaultValue={template.name} disabled={!canEdit} />
          </FormField>
          <FormField label="本文" required>
            <Textarea
              name="body"
              rows={4}
              defaultValue={template.body}
              disabled={!canEdit}
            />
          </FormField>
          <FormField label="投稿先">
            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="targetFacebook"
                  defaultChecked={Boolean(template.defaultTargets.facebook)}
                  disabled={!canEdit}
                />
                Facebook
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="targetInstagram"
                  defaultChecked={Boolean(template.defaultTargets.instagram)}
                  disabled={!canEdit}
                />
                Instagram
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="targetGoogle"
                  defaultChecked={Boolean(template.defaultTargets.google)}
                  disabled={!canEdit}
                />
                Google
              </label>
            </div>
          </FormField>
          {updateState.error && (
            <Callout tone="danger" title="更新に失敗しました">
              {updateState.error}
            </Callout>
          )}
          {updateState.success && (
            <Callout tone="info" title="更新しました">
              {updateState.success}
            </Callout>
          )}
          <Button type="submit" className="w-full" disabled={!canEdit}>
            更新する
          </Button>
        </form>
        <form action={archiveAction} className="space-y-2">
          <input type="hidden" name="id" value={template.id} />
          {archiveState.error && (
            <Callout tone="danger" title="更新に失敗しました">
              {archiveState.error}
            </Callout>
          )}
          {archiveState.success && (
            <Callout tone="info" title="更新しました">
              {archiveState.success}
            </Callout>
          )}
          <Button type="submit" variant="danger" className="w-full" disabled={!canEdit}>
            使わなくする
          </Button>
        </form>
      </div>
    </details>
  );
}

export function PostTemplatesPanel({
  templates,
  canEdit,
  disabledReason,
}: {
  templates: PostTemplate[];
  canEdit: boolean;
  disabledReason: string | null;
}) {
  const [createState, createAction] = useFormState(
    createPostTemplateAction,
    initialState
  );

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">テンプレを追加</h2>
        <p className="text-sm text-slate-500">
          よく使う投稿文を登録して、店舗ごとの投稿で使い回せます。
        </p>
        {disabledReason && (
          <div className="mt-3">
            <Callout tone="warning" title="操作できません">
              {disabledReason}
            </Callout>
          </div>
        )}
        <form action={createAction} className="mt-4 space-y-3">
          <FormField label="テンプレ名" required>
            <Input name="name" placeholder="例: 営業案内" disabled={!canEdit} />
          </FormField>
          <FormField label="本文" required>
            <Textarea
              name="body"
              rows={4}
              placeholder="投稿内容を入力"
              disabled={!canEdit}
            />
          </FormField>
          <FormField label="投稿先">
            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="targetFacebook" defaultChecked disabled={!canEdit} />
                Facebook
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="targetInstagram" disabled={!canEdit} />
                Instagram
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="targetGoogle" disabled={!canEdit} />
                Google
              </label>
            </div>
          </FormField>
          {createState.error && (
            <Callout tone="danger" title="追加に失敗しました">
              {createState.error}
            </Callout>
          )}
          {createState.success && (
            <Callout tone="info" title="追加しました">
              {createState.success}
            </Callout>
          )}
          <Button type="submit" className="w-full" disabled={!canEdit}>
            追加する
          </Button>
        </form>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">登録済みテンプレ</h2>
          <Badge variant="default">{templates.length}</Badge>
        </div>
        {templates.length === 0 ? (
          <Callout tone="info" title="テンプレはまだありません">
            テンプレを追加すると投稿が楽になります。
          </Callout>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <TemplateItem key={template.id} template={template} canEdit={canEdit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
