import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/server/auth/actions";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">サインイン</h2>
        <p className="text-sm text-slate-500">
          ワークスペースの認証情報で続行します。
        </p>
      </div>
      <form action={signInAction} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">メール</label>
          <Input name="email" type="email" placeholder="taro@example.com" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">
            パスワード
          </label>
          <Input name="password" type="password" placeholder="********" />
        </div>
        <Button className="w-full" type="submit">
          サインイン
        </Button>
      </form>
      <p className="text-xs text-slate-500">
        まだアカウントがありませんか？{" "}
        <Link href="/auth/sign-up" className="font-semibold text-slate-900">
          新規作成
        </Link>
        。
      </p>
    </div>
  );
}
