import Link from "next/link";

import { Callout } from "@/components/ui/Callout";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <PageHeader
          title="プライバシーポリシー"
          description="TEPPEN MEO における個人情報の取り扱いについて記載します。"
          tone="light"
        />

        <Card>
          <CardContent className="space-y-4 text-sm leading-relaxed text-slate-700">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">1. 収集する情報</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>アカウント作成時のメールアドレス</li>
                <li>連携先プロバイダから取得するビジネス情報・投稿・レビュー（必要最小限）</li>
                <li>操作ログ（監査目的）</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">2. 利用目的</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>連携プロバイダの管理、投稿、レビュー対応</li>
                <li>監査・障害対応のための操作ログ管理</li>
                <li>不正利用防止およびセキュリティ向上</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">3. 第三者提供</h2>
              <p>法令に基づく場合を除き、本人の同意なく第三者提供は行いません。</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">4. 安全管理</h2>
              <p>暗号化やアクセス制御など、必要な安全管理措置を講じます。</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">5. 権利</h2>
              <p>利用者は自身の情報の開示・訂正・削除を求めることができます。</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">6. お問い合わせ</h2>
              <Callout title="連絡先は未指定です" tone="warning">
                <p className="text-sm text-slate-700">
                  運営者情報と連絡先が確定していないため、確定後に更新します。
                </p>
              </Callout>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">7. 改定</h2>
              <p>必要に応じて改定し、本ページで告知します。</p>
            </section>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 text-sm text-slate-700">
          <Link className="underline" href="/terms">
            利用規約
          </Link>
          <Link className="underline" href="/data-deletion">
            データ削除
          </Link>
        </div>
      </main>
    </div>
  );
}
