import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listAuditLogs } from "@/server/services/audit-logs";
import { listProviderStatus } from "@/server/services/providers";

export default async function AdminOverviewPage() {
  const providers = listProviderStatus();
  const audits = await listAuditLogs();

  const enabled = providers.filter((provider) => provider.enabled).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">管理概要</h1>
        <p className="text-sm text-slate-300">
          システム全体の制御、フラグ、監査ログを管理します。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-slate-700 bg-slate-900 text-slate-100">
          <CardHeader>
            <p className="text-xs text-slate-400">有効なプロバイダ</p>
            <h2 className="text-3xl font-semibold">{enabled}</h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            現在有効な連携数です。
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900 text-slate-100">
          <CardHeader>
            <p className="text-xs text-slate-400">監査イベント</p>
            <h2 className="text-3xl font-semibold">{audits.length}</h2>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            直近50件まで表示します。
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900 text-slate-100">
          <CardHeader>
            <p className="text-xs text-slate-400">プラットフォーム状態</p>
            <div className="mt-2">
              <Badge variant="success">安定</Badge>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            主要機能は稼働中です。
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
