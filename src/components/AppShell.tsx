"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { signOutAction } from "@/server/auth/actions";
import type { MembershipRole } from "@/server/auth/rbac";

type NavItem = {
  href: string;
  label: string;
  badge?: string;
  disabled?: boolean;
  hidden?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type AppShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  organizationName?: string | null;
  membershipRole?: MembershipRole | null;
  isSystemAdmin?: boolean;
};

const roleLabels: Record<MembershipRole, string> = {
  owner: "組織管理者",
  admin: "組織管理者",
  member: "スタッフ",
  viewer: "閲覧のみ",
};

function buildNavSections(params: {
  canManageOrg: boolean;
  isSystemAdmin: boolean;
}): NavSection[] {
  const base: NavSection = {
    title: "基本",
    items: [
      { href: "/app", label: "ダッシュボード" },
      { href: "/app/reviews", label: "口コミ・コメント" },
      { href: "/app/locations", label: "店舗" },
      { href: "/app/setup", label: "初期設定" },
    ],
  };

  const content: NavSection = {
    title: "投稿",
    items: [
      { href: "/app/posts#new", label: "投稿を作る" },
      { href: "/app/posts#list", label: "投稿一覧" },
      {
        href: "/app/post-templates",
        label: "テンプレ",
        hidden: !params.canManageOrg,
      },
    ],
  };

  const planning: NavSection = {
    title: "予定",
    items: [
      { href: "/app/calendar", label: "カレンダー", badge: "準備中" },
    ],
  };

  const systemTools: NavSection = {
    title: "運用ツール",
    items: [
      { href: "/admin/release", label: "リリース準備" },
      { href: "/admin/diagnostics", label: "診断" },
      { href: "/admin/provider-health", label: "ヘルスチェック" },
      { href: "/admin/jobs", label: "ジョブ履歴" },
      { href: "/admin/audit-logs", label: "監査ログ" },
      { href: "/admin/users", label: "ユーザー・契約管理" },
    ],
  };

  return params.isSystemAdmin
    ? [base, content, planning, systemTools]
    : [base, content, planning];
}

export function AppShell({
  children,
  userEmail,
  organizationName,
  membershipRole,
  isSystemAdmin = false,
}: AppShellProps) {
  const pathname = usePathname();
  const canManageOrg = membershipRole === "owner" || membershipRole === "admin" || isSystemAdmin;
  const sections = buildNavSections({ canManageOrg, isSystemAdmin });
  const roleLabel = membershipRole ? roleLabels[membershipRole] : "不明";

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text-default)]">
      <div className="flex min-h-screen">
        <aside className="flex w-64 flex-col border-r border-[color:var(--border)] bg-[color:var(--surface)]">
          <div className="flex items-center gap-3 px-6 py-5">
            <Image
              src="/logo.svg"
              alt="TEPPEN MEO"
              width={160}
              height={36}
              className="h-9 w-auto"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[color:var(--primary)]">
                TEPPEN MEO
              </p>
              <p className="truncate text-xs text-[color:var(--text-muted)]">
                店舗運用ワークスペース
              </p>
            </div>
          </div>

          <div className="px-6 pb-4">
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
              <p className="text-xs text-[color:var(--text-muted)]">店舗グループ</p>
              <p className="truncate text-sm font-semibold text-[color:var(--text-strong)]">
                {organizationName ?? "未登録"}
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
            {sections.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items
                    .filter((item) => !item.hidden)
                    .map((item) => {
                      const normalizedHref = item.href.split("#")[0];
                      const isActive =
                        pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
                      if (item.disabled) {
                        return (
                          <div
                            key={item.href}
                            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-[color:var(--text-muted)]"
                          >
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="text-xs text-[color:var(--text-muted)]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition",
                            isActive
                              ? "bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                              : "text-[color:var(--text-default)] hover:bg-[color:var(--surface-muted)]"
                          )}
                        >
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-xs text-[color:var(--text-muted)]">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-[color:var(--border)] px-6 py-4">
            <p className="text-xs text-[color:var(--text-muted)]">ログイン中</p>
            <p className="truncate text-sm font-semibold text-[color:var(--text-strong)]">
              {userEmail ?? "デモユーザー"}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              権限: {isSystemAdmin ? "システム管理者" : roleLabel}
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div className="min-w-[220px] max-w-md flex-1">
                <Input
                  placeholder="検索（準備中）"
                  aria-label="検索"
                  disabled
                />
              </div>
              <div className="flex items-center gap-3">
                <form action={signOutAction}>
                  <Button variant="secondary" type="submit">
                    サインアウト
                  </Button>
                </form>
              </div>
            </div>
          </header>
          <main className="flex-1 px-6 py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
