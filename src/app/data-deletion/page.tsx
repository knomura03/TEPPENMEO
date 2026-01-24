import Link from "next/link";

import { Callout } from "@/components/ui/Callout";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPublicSiteMetadata } from "@/server/public-site/metadata";

export default function DataDeletionPage() {
  const metadata = getPublicSiteMetadata();
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text-default)]">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <PageHeader
          title="データ削除の手順"
          description="Metaなどの審査で求められる場合があります。利用者からの削除依頼に対応する手順を記載します。"
          tone="light"
        />

        <Card>
          <CardContent className="space-y-4 text-sm leading-relaxed text-[color:var(--text-default)]">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[color:var(--text-strong)]">1. 対象データ</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>ユーザーアカウントおよびプロファイル情報</li>
                <li>連携サービスの認証情報（必要最小限）</li>
                <li>投稿・レビュー・メディアのメタデータ</li>
                <li>監査ログ（削除実施の証跡は必要に応じて保持）</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[color:var(--text-strong)]">2. 依頼方法</h2>
              {metadata.contactEmail ? (
                <Callout title="削除依頼窓口" tone="info">
                  <p className="text-sm text-[color:var(--text-default)]">
                    運営者: {metadata.operatorName ?? "未指定"} / 連絡先メール: {metadata.contactEmail}
                  </p>
                  {metadata.contactUrl && (
                    <p className="text-sm text-[color:var(--text-default)]">
                      問い合わせURL:{" "}
                      <Link className="text-[color:var(--primary)] underline" href={metadata.contactUrl}>
                        お問い合わせフォーム
                      </Link>
                    </p>
                  )}
                </Callout>
              ) : (
                <Callout title="連絡先は未指定です" tone="warning">
                  <p className="text-sm text-[color:var(--text-default)]">
                    削除依頼の受付窓口が未設定です。環境変数で設定してください。
                  </p>
                </Callout>
              )}
              <p>暫定措置: システム管理者が削除依頼を受けた場合、手動で処理します。</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[color:var(--text-strong)]">
                3. 手動削除フロー（暫定）
              </h2>
              <ol className="list-decimal space-y-1 pl-5">
                <li>システム管理者が対象ユーザーの確認を行う</li>
                <li>Supabase Auth でユーザー無効化/削除（誤操作に注意）</li>
                <li>関連する provider_accounts / posts / reviews 等を削除</li>
                <li>監査ログに削除実施を記録（機密は記載しない）</li>
              </ol>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-[color:var(--text-strong)]">4. 自動化（将来）</h2>
              <p>APIによる自己削除リクエストに対応する仕組みを検討中です。</p>
            </section>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 text-sm text-[color:var(--text-default)]">
          <Link className="text-[color:var(--primary)] underline" href="/privacy">
            プライバシーポリシー
          </Link>
          <Link className="text-[color:var(--primary)] underline" href="/terms">
            利用規約
          </Link>
        </div>
      </main>
    </div>
  );
}
