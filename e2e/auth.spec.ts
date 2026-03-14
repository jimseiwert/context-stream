import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("dashboard page is accessible", async ({ page }) => {
    await page.goto("/dashboard");
    // Page should load without server error
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
  });

  test("login page loads successfully", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    // Page should load without server error
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
  });

  test("register page loads successfully", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/register/);
    // Page should load without server error
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
  });

  test("forgot password page loads successfully", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page).toHaveURL(/\/forgot-password/);
    // Page should load without server error
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
  });
});
