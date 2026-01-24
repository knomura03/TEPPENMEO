import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/Callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPublicSiteMetadata } from "@/server/public-site/metadata";

const NavLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="text-sm font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
  >
    {label}
  </Link>
);

export default function Home() {
  const metadata = getPublicSiteMetadata();
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text-default)]">
      <header className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="rounded">
              公開情報
            </Badge>
            <Image
              src="/logo.svg"
              alt="TEPPEN MEO"
              width={160}
              height={32}
              className="h-8 w-auto"
              priority
            />
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
          description="Google Business Profile、Meta、地図検索をまとめて管理し、店舗の口コミ・投稿を一元化するサービスです。"
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
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">
                連携サービスのまとめ管理
              </h2>
            </CardHeader>
            <CardContent className="text-sm text-[color:var(--text-muted)]">
              GoogleとMetaを中心に、Yahoo!やAppleは準備中の連携サービスもあります。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">
                口コミ対応
              </h2>
            </CardHeader>
            <CardContent className="text-sm text-[color:var(--text-muted)]">
              店舗ごとの口コミを確認し、返信の流れを整えます。
              承認前はデモ（仮データ）で確認できます。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">
                地図検索
              </h2>
            </CardHeader>
            <CardContent className="text-sm text-[color:var(--text-muted)]">
              Bing Maps / Yahoo! YOLP を使い、店舗登録の住所候補を
              すばやく取得できます。
            </CardContent>
          </Card>
        </div>

        <Callout title="審査・公開に必要な情報" tone="info">
          <p className="text-sm text-[color:var(--text-default)]">
            プライバシー/利用規約/データ削除案内は公開済みです。審査で要求される場合はこれらのURLを登録してください。
          </p>
          <div className="flex flex-wrap gap-2 pt-2 text-sm">
            <Link className="text-[color:var(--primary)] underline" href="/privacy">
              プライバシーポリシー
            </Link>
            <Link className="text-[color:var(--primary)] underline" href="/terms">
              利用規約
            </Link>
            <Link className="text-[color:var(--primary)] underline" href="/data-deletion">
              データ削除
            </Link>
          </div>
        </Callout>

        <Callout
          title="運営者情報"
          tone={metadata.operatorName && metadata.contactEmail ? "info" : "warning"}
        >
          <p className="text-sm text-[color:var(--text-default)]">
            運営者: {metadata.operatorName ?? "未指定"} / 連絡先メール:{" "}
            {metadata.contactEmail ?? "未指定"}
          </p>
          {metadata.contactUrl ? (
            <p className="text-sm text-[color:var(--text-default)]">
              問い合わせURL:{" "}
              <Link className="text-[color:var(--primary)] underline" href={metadata.contactUrl}>
                問い合わせフォーム
              </Link>
            </p>
          ) : (
            <p className="text-sm text-[color:var(--text-default)]">
              問い合わせURL: 未指定（確定後に環境変数で設定してください）
            </p>
          )}
        </Callout>
      </main>

      <footer className="border-t border-[color:var(--border)] bg-[color:var(--surface)] py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-sm text-[color:var(--text-muted)]">
          <div className="flex items-center gap-3">
            <Link className="text-[color:var(--primary)] underline" href="/privacy">
              プライバシーポリシー
            </Link>
            <Link className="text-[color:var(--primary)] underline" href="/terms">
              利用規約
            </Link>
            <Link className="text-[color:var(--primary)] underline" href="/data-deletion">
              データ削除
            </Link>
          </div>
          <span className="text-[color:var(--text-muted)]">© TEPPEN MEO</span>
        </div>
      </footer>
    </div>
  );
}
