import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { signOutAction } from "@/server/auth/actions";

const navItems = [
  { href: "/app", label: "ダッシュボード" },
  { href: "/app/setup", label: "初期設定" },
  { href: "/app/reviews", label: "口コミ・コメント受信箱" },
  { href: "/app/locations", label: "店舗" },
];

type AppShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  active?: string;
};

export function AppShell({ children, userEmail, active }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text-default)]">
      <header className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
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
                TEPPEN MEO
              </p>
              <p className="text-xs text-slate-500">
                連携サービス統合ワークスペース
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-[color:var(--text-muted)] sm:block">
              <p>ログイン中</p>
              <p className="font-medium text-[color:var(--text-default)]">
                {userEmail ?? "モックユーザー"}
              </p>
            </div>
            <form action={signOutAction}>
              <Button variant="secondary" type="submit">
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
                "rounded-full px-4 py-2 text-sm font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-default)]",
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
