import { redirect } from "next/navigation";

import { AdminShell } from "@/components/AdminShell";
import { BlockedNotice } from "@/components/BlockedNotice";
import { getSessionUser } from "@/server/auth/session";
import { isSystemAdmin } from "@/server/auth/rbac";
import { isSupabaseConfigured } from "@/server/utils/env";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user && isSupabaseConfigured()) {
    redirect("/auth/sign-in");
  }
  if (user?.isBlocked) {
    return <BlockedNotice />;
  }

  const isAdmin = user ? await isSystemAdmin(user.id) : false;
  if (isSupabaseConfigured() && !isAdmin) {
    redirect("/app");
  }

  return <AdminShell userEmail={user?.email}>{children}</AdminShell>;
}
