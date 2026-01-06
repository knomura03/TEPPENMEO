import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listAuditLogs } from "@/server/services/audit-logs";

const actionLabels: Record<string, string> = {
  "provider.connect": "プロバイダ接続",
  "provider.connect_failed": "プロバイダ接続失敗",
  "provider.disconnect": "プロバイダ切断",
  "provider.reauth_required": "再認可要求",
  "provider.link_location": "ロケーション紐付け",
  "provider.link_location_failed": "ロケーション紐付け失敗",
  "reviews.sync": "レビュー同期",
  "reviews.sync_failed": "レビュー同期失敗",
  "reviews.reply": "レビュー返信",
  "reviews.reply_failed": "レビュー返信失敗",
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
