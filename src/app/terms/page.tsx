import Link from "next/link";

import { Callout } from "@/components/ui/Callout";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <PageHeader
          title="利用規約"
          description="TEPPEN MEO の利用条件を定めます。"
          tone="light"
        />

        <Card>
          <CardContent className="space-y-4 text-sm leading-relaxed text-slate-700">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">1. 適用</h2>
              <p>本規約は TEPPEN MEO を利用するすべてのユーザーに適用されます。</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">2. アカウント</h2>
              <p>ユーザーは正確な情報でアカウントを作成し、認証情報を適切に管理するものとします。</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">3. 禁止事項</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>法令やプロバイダ利用規約に違反する行為</li>
                <li>不正アクセス、リバースエンジニアリング</li>
                <li>第三者の権利侵害</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">4. 免責</h2>
              <p>
                本サービスは現状有姿で提供されます。不可抗力や外部API変更による損害については責任を負いません。
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">5. 契約解除</h2>
              <p>利用規約違反があった場合、アカウント停止または利用停止措置を行うことがあります。</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">6. 準拠法</h2>
              <p>本規約は日本法に準拠します。紛争は日本の裁判所を第一審の専属的合意管轄とします。</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">7. お問い合わせ</h2>
              <Callout title="連絡先は未指定です" tone="warning">
                <p className="text-sm text-slate-700">
                  運営者情報と連絡先が確定していないため、確定後に更新します。
                </p>
              </Callout>
            </section>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 text-sm text-slate-700">
          <Link className="underline" href="/privacy">
            プライバシーポリシー
          </Link>
          <Link className="underline" href="/data-deletion">
            データ削除
          </Link>
        </div>
      </main>
    </div>
  );
}
