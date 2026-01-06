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

test("管理診断はサインインまたは診断が表示される", async ({ page }) => {
  await page.goto("/admin/diagnostics", { waitUntil: "domcontentloaded" });
  const hasDiagnostics = await page
    .getByRole("heading", { name: "診断" })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン" })
    .isVisible();

  expect(hasDiagnostics || hasSignIn).toBeTruthy();
});

test("ユーザー管理はサインインまたはユーザー管理が表示される", async ({ page }) => {
  await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
  const hasUsers = await page
    .getByRole("heading", { name: "ユーザー管理" })
    .isVisible();
  const hasSignIn = await page
    .getByRole("heading", { name: "サインイン", exact: true })
    .isVisible();

  if (hasUsers) {
    await expect(
      page.getByRole("heading", { name: "ユーザー管理" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ユーザーを作成" })
    ).toBeVisible();
    await expect(
      page.locator("select[name='mode'] option[value='invite_link']")
    ).toHaveCount(1);
    await expect(
      page.locator("summary", { hasText: "無効化" }).first()
    ).toBeVisible();
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

test("ロケーション詳細でMetaセクションが表示される", async ({ page }) => {
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
    const postButton = page.getByRole("button", { name: "投稿を送信" });
    if (await postButton.isEnabled()) {
      await postButton.click();
      await expect(
        page.getByRole("heading", { name: "Meta（Facebook/Instagram）", exact: true })
      ).toBeVisible();
    }
  } else {
    expect(hasSignIn).toBeTruthy();
  }
});
