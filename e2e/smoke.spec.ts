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
