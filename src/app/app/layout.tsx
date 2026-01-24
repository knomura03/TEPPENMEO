import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { BlockedNotice } from "@/components/BlockedNotice";
import { getMembershipRole, isSystemAdmin } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import { getPrimaryOrganization } from "@/server/services/organizations";
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

  const org = user ? await getPrimaryOrganization(user.id) : null;
  const membershipRole =
    user && org ? await getMembershipRole(user.id, org.id) : null;
  const systemAdmin = user ? await isSystemAdmin(user.id) : false;

  return (
    <AppShell
      userEmail={user?.email}
      organizationName={org?.name ?? null}
      membershipRole={membershipRole}
      isSystemAdmin={systemAdmin}
    >
      {children}
    </AppShell>
  );
}
