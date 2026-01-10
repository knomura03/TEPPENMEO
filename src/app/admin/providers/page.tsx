import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { listProviderStatus } from "@/server/services/providers";

const statusLabels = {
  enabled: "有効",
  not_configured: "未設定",
  mocked: "モック運用",
  disabled: "無効",
};

const statusVariant = {
  enabled: "success",
  not_configured: "warning",
  mocked: "muted",
  disabled: "muted",
} as const;

export default function AdminProvidersPage() {
  const providers = listProviderStatus();

  return (
    <div className="space-y-8">
      <PageHeader
        title="プロバイダ"
        description="機能フラグ、資格情報、対応機能を確認します。"
        tone="dark"
      />

      <Card tone="dark">
        <CardHeader className="border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">機能フラグ</h2>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">
          <p>`.env.local` を更新して再起動してください。</p>
          <ul className="mt-3 grid gap-2 text-sm">
            <li>
              <span className="font-semibold text-slate-200">
                YAHOO_PLACE_ENABLED
              </span>
            </li>
            <li>
              <span className="font-semibold text-slate-200">
                APPLE_BUSINESS_CONNECT_ENABLED
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {providers.map((provider) => (
          <Card key={provider.type} tone="dark">
            <CardHeader className="border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-100">
                    {provider.name}
                  </p>
                  <p className="text-sm text-slate-300">
                    {provider.featureFlag
                      ? `機能フラグ: ${provider.featureFlag}`
                      : "常時有効"}
                  </p>
                </div>
                <Badge variant={statusVariant[provider.status]}>
                  {statusLabels[provider.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="flex flex-wrap gap-2">
                {provider.capabilities.canConnectOAuth && (
                  <Badge variant="default">OAuth</Badge>
                )}
                {provider.capabilities.canListLocations && (
                  <Badge variant="default">ロケーション</Badge>
                )}
                {provider.capabilities.canReadReviews && (
                  <Badge variant="default">レビュー</Badge>
                )}
                {provider.capabilities.canCreatePosts && (
                  <Badge variant="default">投稿</Badge>
                )}
                {provider.capabilities.canSearchPlaces && (
                  <Badge variant="default">検索</Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-300">必須環境変数</p>
                {provider.requiredEnv.length === 0 ? (
                  <p className="text-sm text-slate-400">なし</p>
                ) : (
                  <ul className="mt-2 grid gap-2 text-sm">
                    {provider.requiredEnv.map((envVar) => (
                      <li key={envVar}>
                        <span className="font-semibold text-slate-200">
                          {envVar}
                        </span>
                        {provider.missingEnv.includes(envVar) && (
                          <span className="ml-2 text-amber-300">未設定</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
