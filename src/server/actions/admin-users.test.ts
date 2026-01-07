import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAdminUserAction,
  toggleAdminUserDisabledAction,
  type AdminUserActionState,
} from "@/server/actions/admin-users";
import { isSystemAdmin } from "@/server/auth/rbac";
import { getSessionUser } from "@/server/auth/session";
import {
  createInviteUser,
  disableAdminUser,
  enableAdminUser,
  generateInviteLink,
  getUserEmailById,
} from "@/server/services/admin-users";
import { writeAuditLog } from "@/server/services/audit-logs";
import { blockUser, unblockUser } from "@/server/services/user-blocks";
import { isSupabaseAdminConfigured } from "@/server/utils/env";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/server/auth/rbac", () => ({ isSystemAdmin: vi.fn() }));
vi.mock("@/server/services/admin-users", () => ({
  createInviteUser: vi.fn(),
  createTempPasswordUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  disableAdminUser: vi.fn(),
  enableAdminUser: vi.fn(),
  generateInviteLink: vi.fn(),
  getUserEmailById: vi.fn(),
}));
vi.mock("@/server/services/user-blocks", () => ({
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));
vi.mock("@/server/services/audit-logs", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/server/utils/env", () => ({ isSupabaseAdminConfigured: vi.fn() }));

const baseState: AdminUserActionState = {
  error: null,
  success: null,
  tempPassword: null,
  inviteLink: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "admin-1",
    email: "admin@example.com",
    isBlocked: false,
  });
  vi.mocked(isSystemAdmin).mockResolvedValue(true);
  vi.mocked(isSupabaseAdminConfigured).mockReturnValue(true);
  vi.mocked(writeAuditLog).mockResolvedValue();
  vi.mocked(generateInviteLink).mockResolvedValue(null);
  vi.mocked(createInviteUser).mockResolvedValue(null);
  vi.mocked(disableAdminUser).mockResolvedValue(false);
  vi.mocked(enableAdminUser).mockResolvedValue(false);
  vi.mocked(blockUser).mockResolvedValue({ ok: false });
  vi.mocked(unblockUser).mockResolvedValue({ ok: false });
  vi.mocked(getUserEmailById).mockResolvedValue(null);
});

describe("管理ユーザー招待", () => {
  it("招待メールが成功する", async () => {
    vi.mocked(createInviteUser).mockResolvedValue({
      userId: "user-1",
      email: "invite@example.com",
      invited: true,
    });

    const formData = new FormData();
    formData.set("email", "invite@example.com");
    formData.set("mode", "invite");

    const result = await createAdminUserAction(baseState, formData);

    expect(result.error).toBeNull();
    expect(result.success).toContain("招待メール");
    expect(result.inviteLink).toBeNull();
    expect(vi.mocked(generateInviteLink)).not.toHaveBeenCalled();
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalled();
  });

  it("招待メール失敗時に招待リンクへフォールバックする", async () => {
    vi.mocked(createInviteUser).mockResolvedValue(null);
    vi.mocked(generateInviteLink).mockResolvedValue({
      userId: "user-2",
      email: "fallback@example.com",
      inviteLink: "https://example.com/invite",
    });

    const formData = new FormData();
    formData.set("email", "fallback@example.com");
    formData.set("mode", "invite");

    const result = await createAdminUserAction(baseState, formData);

    expect(result.error).toBeNull();
    expect(result.inviteLink).toBe("https://example.com/invite");
    const auditCall = vi.mocked(writeAuditLog).mock.calls[0]?.[0];
    expect(auditCall?.action).toBe("admin.user.invite_fallback");
    expect(auditCall?.metadata).not.toHaveProperty("inviteLink");
  });
});

describe("ユーザー無効化/有効化", () => {
  it("無効化が成功する", async () => {
    vi.mocked(getUserEmailById).mockResolvedValue("target@example.com");
    vi.mocked(disableAdminUser).mockResolvedValue(true);
    vi.mocked(blockUser).mockResolvedValue({ ok: true });

    const formData = new FormData();
    formData.set("userId", "user-9");
    formData.set("mode", "disable");
    formData.set("confirmEmail", "target@example.com");

    const result = await toggleAdminUserDisabledAction(baseState, formData);

    expect(result.error).toBeNull();
    expect(result.success).toContain("無効化");
    expect(vi.mocked(blockUser)).toHaveBeenCalled();
    const auditCall = vi.mocked(writeAuditLog).mock.calls[0]?.[0];
    expect(auditCall?.action).toBe("admin.user.disable");
  });

  it("無効化が失敗すると監査ログに記録される", async () => {
    vi.mocked(getUserEmailById).mockResolvedValue("target@example.com");
    vi.mocked(disableAdminUser).mockResolvedValue(false);
    vi.mocked(blockUser).mockResolvedValue({
      ok: false,
      error: "table missing",
    });

    const formData = new FormData();
    formData.set("userId", "user-9");
    formData.set("mode", "disable");
    formData.set("confirmEmail", "target@example.com");

    const result = await toggleAdminUserDisabledAction(baseState, formData);

    expect(result.error).toContain("無効化に失敗");
    const auditCall = vi.mocked(writeAuditLog).mock.calls[0]?.[0];
    expect(auditCall?.action).toBe("admin.user.disable_failed");
  });

  it("有効化が成功する", async () => {
    vi.mocked(getUserEmailById).mockResolvedValue("target@example.com");
    vi.mocked(enableAdminUser).mockResolvedValue(true);
    vi.mocked(unblockUser).mockResolvedValue({ ok: true });

    const formData = new FormData();
    formData.set("userId", "user-9");
    formData.set("mode", "enable");

    const result = await toggleAdminUserDisabledAction(baseState, formData);

    expect(result.error).toBeNull();
    expect(result.success).toContain("有効化");
    expect(vi.mocked(unblockUser)).toHaveBeenCalled();
    const auditCall = vi.mocked(writeAuditLog).mock.calls[0]?.[0];
    expect(auditCall?.action).toBe("admin.user.enable");
  });
});
