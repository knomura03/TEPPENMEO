import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { getUserBlock, isUserBlocked } from "@/server/services/user-blocks";
import { isSupabaseAdminConfigured } from "@/server/utils/env";

vi.mock("@/server/db/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/server/utils/env", () => ({ isSupabaseAdminConfigured: vi.fn() }));

const makeAdmin = (result: { data: unknown; error: unknown }) => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue(result),
      }),
    }),
  }),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isSupabaseAdminConfigured).mockReturnValue(true);
});

describe("ユーザーブロック取得", () => {
  it("理由を含めて取得できる", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeAdmin({
        data: { user_id: "user-1", reason: "利用規約違反" },
        error: null,
      }) as unknown as ReturnType<typeof getSupabaseAdmin>
    );

    const block = await getUserBlock("user-1");
    expect(block.blocked).toBe(true);
    expect(block.reason).toBe("利用規約違反");

    const blocked = await isUserBlocked("user-1");
    expect(blocked).toBe(true);
  });

  it("未ブロックの場合はfalseになる", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeAdmin({ data: null, error: null }) as unknown as ReturnType<
        typeof getSupabaseAdmin
      >
    );

    const block = await getUserBlock("user-2");
    expect(block.blocked).toBe(false);
    expect(block.reason).toBeNull();
  });
});
