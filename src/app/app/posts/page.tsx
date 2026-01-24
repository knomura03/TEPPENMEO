import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSessionUser } from "@/server/auth/session";
import { getPrimaryOrganization } from "@/server/services/organizations";
import { listPostsForOrganization } from "@/server/services/posts";

function formatDate(value: string | null) {
  if (!value) return "不明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleString("ja-JP");
}

function mapPostStatus(value: string) {
  if (value === "published") return { label: "成功", variant: "success" as const };
  if (value === "failed") return { label: "失敗", variant: "warning" as const };
  if (value === "queued") return { label: "送信中", variant: "default" as const };
  if (value === "draft") return { label: "下書き", variant: "muted" as const };
  return { label: "不明", variant: "muted" as const };
}

export default async function PostsPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">投稿</h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          ログイン後に投稿の準備を進められます。
        </p>
        <Link href="/auth/sign-in" className="text-[color:var(--primary)] underline">
          サインインへ
        </Link>
      </div>
    );
  }

  const org = await getPrimaryOrganization(user.id);
  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">投稿</h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          管理情報が確認できません。管理者に確認してください。
        </p>
      </div>
    );
  }

  const posts = await listPostsForOrganization(org.id);
  const primaryLink = buttonStyles({ variant: "primary", size: "md" });
  const secondaryLink = buttonStyles({ variant: "secondary", size: "md" });

  return (
    <div className="space-y-8">
      <PageHeader
        title="投稿"
        description="投稿の作成と履歴をまとめて確認できます。"
        tone="light"
        actions={
          <Link href="/app/locations" className={primaryLink}>
            店舗から投稿を作る
          </Link>
        }
      />

      <section id="new" className="space-y-4">
        <Card tone="light">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">投稿を作る</h2>
            <p className="text-sm text-[color:var(--text-muted)]">
              投稿は店舗ごとに作成します。テンプレを使うと入力が簡単です。
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/app/locations" className={primaryLink}>
              店舗を選ぶ
            </Link>
            <Link href="/app/post-templates" className={secondaryLink}>
              テンプレを管理する
            </Link>
          </CardContent>
        </Card>
      </section>

      <section id="list" className="space-y-4">
        <Card tone="light">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">投稿一覧</h2>
              <Badge variant="default">{posts.length}件</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <EmptyState
                title="まだ投稿がありません。"
                description="最初の投稿を作成して店舗の情報発信を始めましょう。"
                actions={
                  <Link href="/app/locations" className={secondaryLink}>
                    店舗一覧へ
                  </Link>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">日時</TableHead>
                    <TableHead className="min-w-[240px]">本文</TableHead>
                    <TableHead className="whitespace-nowrap">対象</TableHead>
                    <TableHead className="whitespace-nowrap">状態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => {
                    const status = mapPostStatus(post.status);
                    return (
                      <TableRow key={post.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-[color:var(--text-muted)]">
                          {formatDate(post.createdAt)}
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-2 text-sm text-[color:var(--text-default)]">
                            {post.content || "本文がありません。"}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-[color:var(--text-muted)]">
                          {post.providers.length > 0 ? post.providers.join(" / ") : "未指定"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
