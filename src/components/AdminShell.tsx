import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { signOutAction } from "@/server/auth/actions";

const navItems = [
  { href: "/admin", label: "概要" },
  { href: "/admin/providers", label: "プロバイダ" },
  { href: "/admin/audit-logs", label: "監査ログ" },
  { href: "/admin/jobs", label: "ジョブ" },
  { href: "/admin/diagnostics", label: "診断" },
  { href: "/admin/provider-health", label: "実機ヘルス" },
  { href: "/admin/users", label: "ユーザー" },
  { href: "/admin/organizations", label: "組織" },
];

type AdminShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  active?: string;
};

export function AdminShell({ children, userEmail, active }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400 text-slate-900">
              <div className="flex h-full w-full items-center justify-center text-sm font-bold">
                AD
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">システム管理</p>
              <p className="text-xs text-slate-400">TEPPEN MEO 統合管理</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-slate-400 sm:block">
              <p>管理者ユーザー</p>
              <p className="font-medium text-slate-200">
                {userEmail ?? "モック管理者"}
              </p>
            </div>
            <form action={signOutAction}>
              <Button
                variant="secondary"
                type="submit"
                className="bg-slate-700 text-slate-100 hover:bg-slate-600"
              >
                サインアウト
              </Button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl items-center gap-2 px-6 pb-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800",
                active === item.label && "bg-slate-800 text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
