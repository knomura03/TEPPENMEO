import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16">
        <div className="flex flex-col gap-6">
          <Badge variant="warning" className="w-fit">
            最小版準備中
          </Badge>
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
            TEPPEN MEO
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Google Business Profile、Meta、地図検索を一つにまとめ、
            ロケーション管理・レビュー対応・投稿を一元化します。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/sign-in">
              <Button>サインイン</Button>
            </Link>
            <Link href="/app">
              <Button variant="secondary">アプリへ</Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost">管理コンソール</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">
                プロバイダ統合
              </h2>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              GoogleとMetaを中心に、Yahoo!やAppleはパートナー連携前提の
              スタブとして整備済みです。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">
                レビュー対応
              </h2>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              ロケーション単位でレビューを確認し、返信フローを整理します。
              承認前はモックで検証可能です。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">
                地図検索
              </h2>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Bing Maps / Yahoo! YOLP を使い、ロケーション登録の住所候補を
              すばやく取得できます。
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                プロバイダ設定の案内が必要ですか？
              </p>
              <p>`docs/providers/` を参照してください。</p>
            </div>
            <Link href="/app/locations">
              <Button variant="secondary">ロケーションを見る</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
