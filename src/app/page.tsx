import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/Callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";

const NavLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="text-sm font-semibold text-slate-700 hover:text-slate-900">
    {label}
  </Link>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-900">
      <header className="border-b border-amber-100 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="rounded">
              公開情報
            </Badge>
            <span className="text-lg font-semibold">TEPPEN MEO</span>
          </div>
          <nav className="flex items-center gap-4">
            <NavLink href="/privacy" label="プライバシー" />
            <NavLink href="/terms" label="利用規約" />
            <NavLink href="/data-deletion" label="データ削除" />
            <Link href="/auth/sign-in">
              <Button size="sm">サインイン</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <PageHeader
          title="TEPPEN MEO"
          description="Google Business Profile、Meta、地図検索をまとめて管理し、ロケーション・レビュー・投稿を一元化する最小版です。"
          tone="light"
        />

        <div className="flex flex-wrap gap-3">
          <Link href="/auth/sign-in">
            <Button size="lg">サインイン</Button>
          </Link>
          <Link href="/app">
            <Button variant="secondary" size="lg">
              アプリへ進む
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="ghost" size="lg">
              管理コンソール
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">プロバイダ統合</h2>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              GoogleとMetaを中心に、Yahoo!やAppleはパートナー連携前提のスタブとして準備。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">レビュー対応</h2>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              ロケーション横断の受信箱で確認・返信。審査前はモックで検証可能。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">地図検索</h2>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Bing Maps / Yahoo! YOLP で住所候補を取得し、登録を短縮。
            </CardContent>
          </Card>
        </div>

        <Callout title="審査・公開に必要な情報" tone="info" className="bg-white">
          <p className="text-sm text-slate-700">
            プライバシー/利用規約/データ削除案内は公開済みです。審査で要求される場合はこれらのURLを登録してください。
          </p>
          <div className="flex flex-wrap gap-2 pt-2 text-sm">
            <Link className="text-blue-700 underline" href="/privacy">
              プライバシーポリシー
            </Link>
            <Link className="text-blue-700 underline" href="/terms">
              利用規約
            </Link>
            <Link className="text-blue-700 underline" href="/data-deletion">
              データ削除
            </Link>
          </div>
        </Callout>
      </main>

      <footer className="border-t border-amber-100 bg-white/70 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <Link className="underline" href="/privacy">
              プライバシーポリシー
            </Link>
            <Link className="underline" href="/terms">
              利用規約
            </Link>
            <Link className="underline" href="/data-deletion">
              データ削除
            </Link>
          </div>
          <span className="text-slate-500">© TEPPEN MEO</span>
        </div>
      </footer>
    </div>
  );
}
