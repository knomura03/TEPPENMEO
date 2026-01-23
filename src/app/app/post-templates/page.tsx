import Link from "next/link";

import { Callout } from "@/components/ui/Callout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMembershipRole, hasRequiredRole } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { listPostTemplates } from "@/server/services/post-templates";
import { getPrimaryOrganization } from "@/server/services/organizations";

import { PostTemplatesPanel } from "./PostTemplatesPanel";

export default async function PostTemplatesPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">投稿テンプレート</h1>
        <p className="text-sm text-slate-500">
          ログイン後にテンプレートを管理できます。
        </p>
        <Link href="/auth/sign-in" className="text-[color:var(--primary)] underline">
          サインインへ
        </Link>
      </div>
    );
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">投稿テンプレート</h1>
        <p className="text-sm text-slate-500">
          管理者情報が確認できません。管理者に確認してください。
        </p>
      </div>
    );
  }

  const role = await getMembershipRole(user.id, org.id);
  const canEdit = hasRequiredRole(role, "admin");
  const { templates, reason } = await listPostTemplates({
    organizationId: org.id,
    includeArchived: false,
  });

  const friendlyReason = reason
    ? "テンプレートを使うには管理者側の設定が必要です。"
    : null;
  const disabledReason = canEdit ? friendlyReason : "管理者のみ操作できます。";

  return (
    <div className="space-y-8">
      <PageHeader
        title="投稿テンプレート"
        description="よく使う投稿文を保存し、店舗ごとの投稿に使えます。"
        tone="light"
      />
      {!canEdit && (
        <Callout tone="warning" title="管理者のみ操作できます">
          テンプレートの追加・編集・削除は管理者のみ行えます。
        </Callout>
      )}
      <PostTemplatesPanel
        templates={templates}
        canEdit={canEdit}
        disabledReason={disabledReason}
      />
    </div>
  );
}
