import { test, expect } from "@playwright/test";

// Shell navigation tests require an authenticated session.
// These tests are skipped unless TEST_USER_EMAIL is set.
// They are meant to run in a local dev environment with a seeded test user.
test.describe("Shell Navigation", () => {
  test.skip(!process.env.TEST_USER_EMAIL, "Requires TEST_USER_EMAIL env var (seeded test user)");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[type='email'], input[name='email']").first().fill(process.env.TEST_USER_EMAIL!);
    await page.locator("input[type='password'], input[name='password']").first().fill(process.env.TEST_USER_PASSWORD ?? "password");
    await page.locator("button[type='submit']").click();
    await page.waitForURL("/dashboard", { timeout: 10000 });
  });

  test("sidebar renders with core nav items", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sources" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jobs" })).toBeVisible();
  });

  test("command palette opens with keyboard shortcut", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await expect(page.getByPlaceholder("Navigate to...")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("Navigate to...")).not.toBeVisible();
  });
});
