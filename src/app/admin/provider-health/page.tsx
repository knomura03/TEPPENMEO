import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { adminActionSecondaryClass } from "@/components/ui/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEnvCheckGroups } from "@/server/services/diagnostics";

import { ProviderHealthPanel } from "./ProviderHealthPanel";

export default function AdminProviderHealthPage() {
  const { providerMockMode } = getEnvCheckGroups();
  const externalApiEnabled = !providerMockMode;

  return (
    <div className="space-y-8">
      <PageHeader
        title="プロバイダ実機ヘルスチェック"
        description="接続済みアカウントに対して読み取り系APIを呼び、実装の正しさを確認します。"
        tone="light"
      />

      <Card tone="light">
        <CardHeader className="border-slate-200">
          <p className="text-base font-semibold text-slate-900">事前確認</p>
          <p className="text-sm text-slate-600">
            破壊的操作は行いません。機密値は表示・記録しません。
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>モック運用</span>
            <Badge variant={providerMockMode ? "warning" : "success"}>
              {providerMockMode ? "ON" : "OFF"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>外部API呼び出し</span>
            <Badge variant={externalApiEnabled ? "success" : "warning"}>
              {externalApiEnabled ? "有効" : "無効"}
            </Badge>
          </div>
          <ul className="list-disc space-y-2 pl-4">
            <li>接続済みアカウントが必要です（未接続の場合は診断から接続）。</li>
            <li>App ReviewやAPI承認が未完了だと警告になります。</li>
            <li>詳細手順は手順書を参照してください。</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <a href="/admin/diagnostics" className={adminActionSecondaryClass}>
              診断を開く
            </a>
            <a
              href="/docs/runbooks/provider-real-api-health-check"
              className={adminActionSecondaryClass}
            >
              実機チェック手順書
            </a>
            <a
              href="/docs/runbooks/switch-mock-to-real"
              className={adminActionSecondaryClass}
            >
              モック→実機の切り替え手順
            </a>
          </div>
        </CardContent>
      </Card>

      <ProviderHealthPanel />
    </div>
  );
}
