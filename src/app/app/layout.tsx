import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { BlockedNotice } from "@/components/BlockedNotice";
import { getSessionUser } from "@/server/auth/session";
import { isSupabaseConfigured } from "@/server/utils/env";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user && isSupabaseConfigured()) {
    redirect("/auth/sign-in");
  }
  if (user?.isBlocked) {
    return <BlockedNotice reason={user.blockReason} />;
  }

  return <AppShell userEmail={user?.email}>{children}</AppShell>;
}
