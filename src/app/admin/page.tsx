import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { listAuditLogs } from "@/server/services/audit-logs";
import { listProviderStatus } from "@/server/services/providers";

export default async function AdminOverviewPage() {
  const providers = listProviderStatus();
  const audits = await listAuditLogs();

  const enabled = providers.filter((provider) => provider.enabled).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="管理概要"
        description="システム全体の制御、フラグ、監査ログを管理します。"
        tone="light"
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card tone="light">
          <CardHeader className="border-slate-200">
            <p className="text-sm text-slate-600">有効なプロバイダ</p>
            <h2 className="text-3xl font-semibold">{enabled}</h2>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            現在有効な連携数です。
          </CardContent>
        </Card>
        <Card tone="light">
          <CardHeader className="border-slate-200">
            <p className="text-sm text-slate-600">監査イベント</p>
            <h2 className="text-3xl font-semibold">{audits.length}</h2>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            直近50件まで表示します。
          </CardContent>
        </Card>
        <Card tone="light">
          <CardHeader className="border-slate-200">
            <p className="text-sm text-slate-600">プラットフォーム状態</p>
            <div className="mt-2">
              <Badge variant="success">安定</Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            主要機能は稼働中です。
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
