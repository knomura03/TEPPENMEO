import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/server/auth/actions";

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">アカウント作成</h2>
        <p className="text-sm text-slate-500">
          新しいワークスペースを開始します。
        </p>
      </div>
      <form action={signUpAction} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">メール</label>
          <Input name="email" type="email" placeholder="taro@example.com" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">
            パスワード
          </label>
          <Input name="password" type="password" placeholder="新しいパスワード" />
        </div>
        <Button className="w-full" type="submit">
          作成する
        </Button>
      </form>
      <p className="text-xs text-slate-500">
        すでにアカウントがありますか？{" "}
        <Link href="/auth/sign-in" className="font-semibold text-slate-900">
          サインイン
        </Link>
        。
      </p>
    </div>
  );
}
