import { expect, test } from "@playwright/test";

test("認証画面が表示される", async ({ page }) => {
  await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "サインイン" })).toBeVisible();
});

test("ロケーション画面はサインインまたはロケーションが表示される", async ({
  page,
}) => {
  await page.goto("/app/locations", { waitUntil: "domcontentloaded" });
  const hasLocations = await page
    .getByRole("heading", { name: "ロケーション", exact: true })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();

  expect(hasLocations || hasSignIn).toBeTruthy();
});

test(
  "管理診断はサインインまたは診断が表示される",
  async ({ page }, testInfo) => {
  await page.goto("/admin/diagnostics", { waitUntil: "domcontentloaded" });
  const hasDiagnostics = await page
    .getByRole("heading", { name: "診断" })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン" })
    .isVisible();

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("admin-diagnostics-providers", {
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

    if (hasOverview) {
      await expect(
        page.getByRole("heading", { name: "管理概要", exact: true })
      ).toBeVisible();
    } else {
      expect(hasSignIn).toBeTruthy();
    }
  }
);

test("監査ログはサインインまたは監査ログが表示される", async ({ page }) => {
  await page.goto("/admin/audit-logs", { waitUntil: "domcontentloaded" });
  const hasAuditLogs = await page
    .getByRole("heading", { name: "監査ログ", exact: true })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();

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
});

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

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("app-location-post-history", {
    body: screenshot,
    contentType: "image/png",
  });
});
