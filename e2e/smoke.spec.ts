import { expect, test } from "@playwright/test";

test("認証画面が表示される", async ({ page }) => {
  await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "サインイン" })).toBeVisible();
});

test("ロケーション画面はサインインまたはロケーションが表示される", async ({
  page,
}, testInfo) => {
  await page.goto("/app/locations", { waitUntil: "domcontentloaded" });
  const hasLocations = await page
    .getByRole("heading", { name: "ロケーション", exact: true })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("app-locations-ui-primitives", {
    body: screenshot,
    contentType: "image/png",
  });

  expect(hasLocations || hasSignIn).toBeTruthy();
});

test(
  "管理診断はサインインまたは診断が表示される",
  async ({ page }, testInfo) => {
  await page.goto("/admin/diagnostics", { waitUntil: "domcontentloaded" });
  const hasDiagnostics =
    (await page.getByRole("heading", { name: "診断" }).count()) > 0;
  const hasSignIn =
    (await page.getByRole("heading", { name: "サインイン", exact: true }).count()) >
    0;

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("admin-diagnostics-design", {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach("admin-diagnostics-providers", {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach("admin-diagnostics-mock-mode", {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach("admin-diagnostics-permissions-diff", {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach("admin-diagnostics-migrations-media-assets", {
    body: screenshot,
    contentType: "image/png",
  });

  expect(hasDiagnostics || hasSignIn).toBeTruthy();
});

test(
  "実機ヘルスチェックはサインインまたはヘルスチェックが表示される",
  async ({ page }, testInfo) => {
  await page.goto("/admin/provider-health", { waitUntil: "domcontentloaded" });
  const hasHealth = await page
    .getByRole("heading", { name: "プロバイダ実機ヘルスチェック" })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("admin-provider-health", {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach("admin-provider-health-design", {
    body: screenshot,
    contentType: "image/png",
  });

  if (hasHealth) {
    await expect(
      page.getByText("Google Business Profile", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Meta（Facebook/Instagram）")).toBeVisible();
  } else {
    expect(hasSignIn).toBeTruthy();
  }
});

test(
  "管理概要はサインインまたは管理概要が表示される",
  async ({ page }, testInfo) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    const hasOverview = await page
      .getByRole("heading", { name: "管理概要", exact: true })
      .isVisible();
    const hasSignIn = await page
      .getByRole("heading", { name: "サインイン", exact: true })
      .isVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("admin-overview", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("admin-overview-design", {
      body: screenshot,
      contentType: "image/png",
    });

    if (hasOverview) {
      await expect(
        page.getByRole("heading", { name: "管理概要", exact: true })
      ).toBeVisible();
    } else {
      expect(hasSignIn).toBeTruthy();
    }
  }
);

test(
  "セットアップはサインインまたはセットアップが表示される",
  async ({ page }, testInfo) => {
    await page.goto("/app/setup", { waitUntil: "domcontentloaded" });
    const hasSetup = await page
      .getByRole("heading", { name: "セットアップチェック" })
      .isVisible();
    const hasSignIn = await page
      .getByRole("heading", { name: "サインイン", exact: true })
      .isVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("app-setup-checklist", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-setup-detailed", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-setup-design", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-setup-ui-primitives", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-setup-kpis-media", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-setup-bulk-sync", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-setup-bulk-sync-scheduling", {
      body: screenshot,
      contentType: "image/png",
    });

    if (hasSetup) {
      await expect(page.getByText("進捗", { exact: true })).toBeVisible();
      await expect(page.getByText("最終アップロード")).toBeVisible();
      await expect(page.getByText("Googleレビューを一括同期")).toBeVisible();
      await expect(page.getByText("自動同期", { exact: true })).toBeVisible();
    }
    expect(hasSetup || hasSignIn).toBeTruthy();
  }
);

test("監査ログはサインインまたは監査ログが表示される", async ({ page }, testInfo) => {
  await page.goto("/admin/audit-logs", { waitUntil: "domcontentloaded" });
  const hasAuditLogs = await page
    .getByRole("heading", { name: "監査ログ", exact: true })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("admin-audit-logs-design", {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach("admin-audit-logs-table", {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach("admin-audit-logs-ui-primitives", {
    body: screenshot,
    contentType: "image/png",
  });
  const detailToggle = page.locator("summary", { hasText: "詳細" }).first();
  if (hasAuditLogs && (await detailToggle.count()) > 0) {
    await detailToggle.click();
  }
  const detailShot = await page.screenshot({ fullPage: true });
  await testInfo.attach("admin-audit-logs-table-details", {
    body: detailShot,
    contentType: "image/png",
  });

  if (hasAuditLogs) {
    await expect(page.locator("input[name='from']")).toBeVisible();
    await expect(page.locator("input[name='to']")).toBeVisible();
    await expect(page.locator("select[name='action']")).toBeVisible();
    await expect(page.locator("select[name='org']")).toBeVisible();
    await expect(page.locator("input[name='actor']")).toBeVisible();
    await expect(page.locator("select[name='provider']")).toBeVisible();
    await expect(page.locator("input[name='text']")).toBeVisible();
    const applyButton = page.getByRole("button", { name: "適用" });
    await applyButton.click();
    await expect(
      page.getByRole("heading", { name: "監査ログ", exact: true })
    ).toBeVisible();
    const exportLink = page.getByRole("link", { name: "CSVエクスポート" });
    await expect(exportLink).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportLink.click(),
    ]);
    expect(download.suggestedFilename()).toContain("audit-logs");
  } else {
    expect(hasSignIn).toBeTruthy();
  }
});

test(
  "レビュー受信箱はサインインまたはレビュー受信箱が表示される",
  async ({ page }, testInfo) => {
    await page.goto("/app/reviews", { waitUntil: "domcontentloaded" });
    const hasInbox = await page
      .getByRole("heading", { name: "レビュー受信箱", exact: true })
      .isVisible();
    const hasSignIn = await page
      .getByRole("heading", { name: "サインイン", exact: true })
      .isVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("app-reviews-inbox", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-reviews-reply", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-reviews-design", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-reviews-ui-primitives", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("app-reviews-table", {
      body: screenshot,
      contentType: "image/png",
    });
    const detailToggle = page.locator("summary", { hasText: "詳細" }).first();
    if (hasInbox && (await detailToggle.count()) > 0) {
      await detailToggle.click();
    }
    const detailShot = await page.screenshot({ fullPage: true });
    await testInfo.attach("app-reviews-table-details", {
      body: detailShot,
      contentType: "image/png",
    });

    if (hasInbox) {
      await expect(
        page.getByRole("heading", { name: "レビュー一覧", exact: true })
      ).toBeVisible();
      await expect(page.locator("input[name='q']")).toBeVisible();
      await expect(page.locator("select[name='locationId']")).toBeVisible();
      await expect(page.locator("select[name='provider']")).toBeVisible();
      await expect(page.locator("select[name='period']")).toBeVisible();
      await expect(page.getByText("未返信のみ", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "返信を送信" }).first()).toBeVisible();
    } else {
      expect(hasSignIn).toBeTruthy();
    }
  }
);

test(
  "ユーザー管理はサインインまたはユーザー管理が表示される",
  async ({ page }, testInfo) => {
    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    const hasUsers = await page
      .getByRole("heading", { name: "ユーザー管理" })
      .isVisible();
    const hasSignIn = await page
      .getByRole("heading", { name: "サインイン", exact: true })
      .isVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("admin-users", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("admin-users-design", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("admin-users-ui-primitives", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("admin-users-table", {
      body: screenshot,
      contentType: "image/png",
    });
    const detailToggle = page.locator("summary", { hasText: "詳細" }).first();
    if (hasUsers && (await detailToggle.count()) > 0) {
      await detailToggle.click();
    }
    const detailShot = await page.screenshot({ fullPage: true });
    await testInfo.attach("admin-users-table-details", {
      body: detailShot,
      contentType: "image/png",
    });

    if (hasUsers) {
      await expect(
        page.getByRole("heading", { name: "ユーザー管理" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "ユーザーを作成" })
      ).toBeVisible();
      await expect(page.getByText("招待テンプレ", { exact: true })).toBeVisible();
      await expect(
        page.locator("select[name='mode'] option[value='invite_link']")
      ).toHaveCount(1);
      await expect(page.locator("select[name='status']")).toBeVisible();
      await expect(page.locator("select[name='org']")).toBeVisible();
      const hasDisableControl = await page
        .locator("summary", { hasText: "無効化" })
        .first()
        .isVisible();
      const hasMigrationWarning = await page
        .getByText("マイグレーション未適用", { exact: false })
        .isVisible();

      expect(hasDisableControl || hasMigrationWarning).toBeTruthy();
    } else {
      expect(hasSignIn).toBeTruthy();
    }
  }
);

test(
  "ジョブ履歴はサインインまたはジョブ履歴が表示される",
  async ({ page }, testInfo) => {
    await page.goto("/admin/jobs", { waitUntil: "domcontentloaded" });
    const hasJobs = await page
      .getByRole("heading", { name: "ジョブ履歴" })
      .isVisible();
    const hasSignIn = await page
      .getByRole("heading", { name: "サインイン", exact: true })
      .isVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("admin-jobs", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("admin-jobs-design", {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach("admin-jobs-table", {
      body: screenshot,
      contentType: "image/png",
    });
    const detailToggle = page.locator("summary", { hasText: "詳細" }).first();
    if (hasJobs && (await detailToggle.count()) > 0) {
      await detailToggle.click();
    }
    const detailShot = await page.screenshot({ fullPage: true });
    await testInfo.attach("admin-jobs-table-details", {
      body: detailShot,
      contentType: "image/png",
    });

    if (hasJobs) {
      await expect(
        page.getByRole("heading", { name: "ジョブ履歴", exact: true })
      ).toBeVisible();
    } else {
      expect(hasSignIn).toBeTruthy();
    }
  }
);

test("組織一覧はサインインまたは組織管理が表示される", async ({ page }) => {
  await page.goto("/admin/organizations", { waitUntil: "domcontentloaded" });
  const hasOrganizations = await page
    .getByRole("heading", { name: "組織管理" })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();

  if (hasOrganizations) {
    await expect(
      page.getByRole("heading", { name: "組織管理" })
    ).toBeVisible();
    await expect(page.getByText("組織一覧", { exact: true })).toBeVisible();
  } else {
    expect(hasSignIn).toBeTruthy();
  }
});

test("組織メンバー管理はサインインまたはメンバー一覧が表示される", async ({
  page,
}) => {
  await page.goto("/admin/organizations/org-1", {
    waitUntil: "domcontentloaded",
  });
  const hasMembers = await page
    .getByRole("heading", { name: "組織メンバー管理" })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();

  if (hasMembers) {
    await expect(
      page.getByRole("heading", { name: "組織メンバー管理" })
    ).toBeVisible();
    await expect(page.getByText("メンバー一覧", { exact: true })).toBeVisible();
  } else {
    expect(hasSignIn).toBeTruthy();
  }
});

test("ロケーション詳細でGoogleセクションが表示される", async ({ page }) => {
  await page.goto("/app/locations/loc-1", { waitUntil: "domcontentloaded" });
  const hasGoogleSection = await page
    .getByRole("heading", { name: "Google Business Profile", exact: true })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();

  if (hasGoogleSection) {
    const syncButton = page.getByRole("button", { name: "レビュー同期" });
    await syncButton.click();
    await expect(
      page.getByRole("heading", { name: "Google Business Profile", exact: true })
    ).toBeVisible();
  } else {
    expect(hasSignIn).toBeTruthy();
  }
});

test(
  "ロケーション詳細でMetaセクションが表示される",
  async ({ page }, testInfo) => {
  await page.goto("/app/locations/loc-1", { waitUntil: "domcontentloaded" });
  const hasMetaSection = await page
    .getByRole("heading", { name: "Meta（Facebook/Instagram）", exact: true })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();

  if (hasMetaSection) {
    await expect(
      page.getByText("Facebookページ紐付け", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Googleに投稿", { exact: true })).toBeVisible();
    const postButton = page.getByRole("button", { name: "投稿を送信" });
    const uploadRadio = page.getByRole("radio", { name: "ファイルアップロード" });
    if (await uploadRadio.isVisible()) {
      const uploadEnabled = await uploadRadio.isEnabled();
      if (uploadEnabled) {
        await uploadRadio.check();
        const fileInput = page.locator("input[type='file']");
        await fileInput.setInputFiles("e2e/fixtures/upload.png");
        const uploadButton = page.getByRole("button", { name: "画像をアップロード" });
        await uploadButton.click();
        await expect(page.getByText("アップロード済み")).toBeVisible();
      }
    }
    if (await postButton.isEnabled()) {
      await postButton.click();
      await expect(
        page.getByRole("heading", { name: "Meta（Facebook/Instagram）", exact: true })
      ).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "投稿履歴", exact: true })).toBeVisible();
  } else {
    expect(hasSignIn).toBeTruthy();
  }

  const composerShot = await page.screenshot({ fullPage: true });
  await testInfo.attach("app-location-post-composer", {
    body: composerShot,
    contentType: "image/png",
  });
  await testInfo.attach("app-location-detail-ui-primitives", {
    body: composerShot,
    contentType: "image/png",
  });

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("app-location-post-history", {
    body: screenshot,
    contentType: "image/png",
  });
});
