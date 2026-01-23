import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/auth/actions";

export function BlockedNotice({
  title = "利用停止中",
  message = "このアカウントは組織管理者により無効化されています。組織管理者に連絡してください。",
  reason,
}: {
  title?: string;
  message?: string;
  reason?: string | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <div className="rounded-xl border border-amber-400/40 bg-amber-900/20 p-6 text-amber-100 shadow-sm">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm text-amber-100/80">{message}</p>
          {reason && (
            <p className="mt-2 text-xs text-amber-100/70">
              利用停止理由: {reason}
            </p>
          )}
          <form action={signOutAction} className="mt-6">
            <Button
              type="submit"
              className="w-full bg-amber-400 text-slate-900 hover:bg-amber-300 focus-visible:outline-amber-300"
            >
              サインアウト
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
