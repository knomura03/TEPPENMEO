import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { signOutAction } from "@/server/auth/actions";

const navItems = [
  { href: "/admin", label: "概要" },
  { href: "/admin/providers", label: "プロバイダ" },
  { href: "/admin/audit-logs", label: "監査ログ" },
  { href: "/admin/jobs", label: "ジョブ" },
  { href: "/admin/release", label: "リリース準備" },
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
    <div className="min-h-screen bg-[color:var(--admin-bg)] text-[color:var(--text-default)]">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="TEPPEN MEO"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
            <div>
              <p className="text-sm font-semibold text-[color:var(--primary)]">
                システム管理
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">
                TEPPEN MEO 統合管理
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-[color:var(--text-muted)] sm:block">
              <p>システム管理者</p>
              <p className="font-medium text-[color:var(--text-default)]">
                {userEmail ?? "モック管理者"}
              </p>
            </div>
            <form action={signOutAction}>
              <Button
                variant="secondary"
                type="submit"
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                "rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/70 hover:text-slate-900",
                active === item.label &&
                  "bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
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
