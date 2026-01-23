import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { DetailsDisclosure } from "@/components/ui/details-disclosure";
import type { AdminUser, AdminUserStatus } from "@/server/services/admin-users";

import { DeleteUserForm } from "./DeleteUserForm";
import { SystemAdminToggleForm } from "./SystemAdminToggleForm";
import { ToggleUserStatusForm } from "./ToggleUserStatusForm";

type ColumnDef<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

function formatDate(value: string | null) {
  if (!value) return "不明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleString("ja-JP");
}

function getStatusLabel(status: AdminUserStatus) {
  if (status === "disabled") {
    return { label: "無効", variant: "warning" as const };
  }
  if (status === "invited") {
    return { label: "招待中", variant: "muted" as const };
  }
  return { label: "有効", variant: "success" as const };
}

export function createAdminUserColumns(params: {
  userBlocksReady: boolean;
  userBlocksMessage: string | null;
  canManageSystemAdmin: boolean;
  currentUserId: string | null;
}): ColumnDef<AdminUser>[] {
  return [
    {
      header: "メール",
      cell: (user) => user.email ?? "不明",
      cellClassName: "min-w-[200px] text-slate-900",
    },
    {
      header: "作成日",
      cell: (user) => formatDate(user.createdAt),
      cellClassName: "whitespace-nowrap text-slate-500",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "所属組織数",
      cell: (user) => user.membershipCount,
      cellClassName: "whitespace-nowrap text-slate-600",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "システム管理者",
      cell: (user) => (
        <Badge variant={user.isSystemAdmin ? "success" : "muted"}>
          {user.isSystemAdmin ? "付与済み" : "未付与"}
        </Badge>
      ),
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "状態",
      cell: (user) => {
        const status = getStatusLabel(user.status);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
      cellClassName: "whitespace-nowrap",
      headerClassName: "whitespace-nowrap",
    },
    {
      header: "操作",
      cell: (user) => (
        <div className="flex flex-col gap-2">
          <SystemAdminToggleForm
            userId={user.id}
            email={user.email}
            isSystemAdmin={user.isSystemAdmin}
            currentUserId={params.currentUserId}
            canManage={params.canManageSystemAdmin}
          />
          <ToggleUserStatusForm
            userId={user.id}
            email={user.email}
            isDisabled={user.isDisabled}
            userBlocksReady={params.userBlocksReady}
            userBlocksMessage={params.userBlocksMessage}
          />
          <DeleteUserForm userId={user.id} email={user.email} />
        </div>
      ),
      cellClassName: "min-w-[200px]",
    },
    {
      header: "詳細",
      cell: (user) => (
        <DetailsDisclosure
          tone="light"
          items={[
            { label: "ユーザーID", value: user.id, mono: true },
            { label: "作成日", value: formatDate(user.createdAt), mask: false },
            { label: "招待日時", value: formatDate(user.invitedAt), mask: false },
            { label: "最終ログイン", value: formatDate(user.lastSignInAt), mask: false },
            {
              label: "所属組織数",
              value: user.membershipCount.toString(),
              mask: false,
            },
            {
              label: "システム管理者",
              value: user.isSystemAdmin ? "付与済み" : "未付与",
              mask: false,
            },
            { label: "状態", value: user.status, mask: false },
          ]}
        />
      ),
      cellClassName: "min-w-[120px]",
      headerClassName: "whitespace-nowrap",
    },
  ];
}
