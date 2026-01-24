import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSessionUser } from "@/server/auth/session";

export default async function CalendarPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">カレンダー</h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          ログイン後に予定を確認できます。
        </p>
        <Link href="/auth/sign-in" className="text-[color:var(--primary)] underline">
          サインインへ
        </Link>
      </div>
    );
  }

  const primaryLink = buttonStyles({ variant: "primary", size: "md" });

  return (
    <div className="space-y-8">
      <PageHeader
        title="カレンダー"
        description="投稿や口コミ対応の予定をまとめて確認できます。"
        tone="light"
      />

      <Card tone="light">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">準備中</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            予定の管理機能は現在準備中です。まずは店舗や投稿から始めてください。
          </p>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="カレンダーは準備中です"
            description="投稿や口コミ対応の状況はダッシュボードで確認できます。"
            actions={
              <Link href="/app" className={primaryLink}>
                ダッシュボードへ
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
