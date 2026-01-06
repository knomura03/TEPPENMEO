import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listAuditLogs } from "@/server/services/audit-logs";

const actionLabels: Record<string, string> = {
  "provider.connect": "プロバイダ接続",
  "provider.disconnect": "プロバイダ切断",
  "reviews.sync": "レビュー同期",
  "posts.publish": "投稿公開",
};

export default async function AdminAuditLogsPage() {
  const logs = await listAuditLogs();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">監査ログ</h1>
        <p className="text-sm text-slate-300">
          プロバイダ連携や同期の履歴を確認します。
        </p>
      </div>

      <Card className="border-slate-700 bg-slate-900">
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">最新イベント</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              >
                <p className="text-xs text-slate-400">{log.createdAt}</p>
                <p className="text-sm font-semibold text-slate-100">
                  {actionLabels[log.action] ?? "不明な操作"}
                </p>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-sm text-slate-400">イベントはまだありません。</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
