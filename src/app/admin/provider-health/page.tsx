import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getEnvCheckGroups } from "@/server/services/diagnostics";

import { ProviderHealthPanel } from "./ProviderHealthPanel";

export default function AdminProviderHealthPage() {
  const { providerMockMode } = getEnvCheckGroups();
  const externalApiEnabled = !providerMockMode;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          プロバイダ実機ヘルスチェック
        </h1>
        <p className="text-sm text-slate-300">
          接続済みアカウントに対して読み取り系APIを呼び、実装の正しさを確認します。
        </p>
      </div>

      <Card tone="dark">
        <CardHeader>
          <p className="text-sm font-semibold">事前確認</p>
          <p className="text-xs text-slate-400">
            破壊的操作は行いません。機密値は表示・記録しません。
          </p>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>モック運用</span>
            <Badge variant={providerMockMode ? "warning" : "success"}>
              {providerMockMode ? "ON" : "OFF"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>外部API呼び出し</span>
            <Badge variant={externalApiEnabled ? "success" : "warning"}>
              {externalApiEnabled ? "有効" : "無効"}
            </Badge>
          </div>
          <ul className="list-disc space-y-1 pl-4">
            <li>接続済みアカウントが必要です（未接続の場合は診断から接続）。</li>
            <li>App ReviewやAPI承認が未完了だと警告になります。</li>
            <li>詳細手順は手順書を参照してください。</li>
          </ul>
          <div className="flex flex-wrap gap-3 text-xs">
            <a
              href="/admin/diagnostics"
              className="text-amber-200 underline"
            >
              診断を開く
            </a>
            <a
              href="/docs/runbooks/provider-real-api-health-check"
              className="text-amber-200 underline"
            >
              実機チェック手順書
            </a>
            <a
              href="/docs/runbooks/switch-mock-to-real"
              className="text-amber-200 underline"
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
