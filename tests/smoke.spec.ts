import { test, expect } from "@playwright/test";
test("example is real, navigable, and linked to pinned source", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Architecture, connected." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "View source" })).toHaveAttribute(
    "href",
    /github\.com\/deepdotspace\/threadhunt\/blob\/[a-f0-9]{40}\//,
  );
  await page
    .getByRole("button", { name: "Focus connections", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Show all modules" }),
  ).toHaveAttribute("aria-pressed", "true");
  const focusedCount = await page.locator(".rl-module").count();
  expect(focusedCount).toBeGreaterThan(0);
  expect(focusedCount).toBeLessThan(22);
  await page.getByRole("button", { name: "Show all modules" }).click();
  await expect(page.locator(".rl-module")).toHaveCount(22);
  await expect(
    page.getByRole("link", { name: "Live walkthrough" }),
  ).toHaveAttribute("href", /home\?analysis=/);
  await page.screenshot({ path: "../repolens-desktop.png", fullPage: false });
  await page.getByRole("button", { name: "Walkthrough", exact: true }).click();
  await expect(page.getByText("Step 1 of", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("Step 2 of", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(page.locator(".rl-code-title").first()).toContainText("src/schemas/users-schema.ts");
  await expect(page.getByRole("link", { name: "Open on GitHub" })).toBeVisible();
  await page.getByRole("button", { name: "Walkthrough", exact: true }).click();
  await expect(page.getByText("Step 2 of", { exact: false })).toBeVisible();
});
test("sign-in dialog traps focus and closes with Escape", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("button", { name: "Import repository" }).click();
  const dialog = page.getByRole("dialog", { name: "Sign in to RepoLens" });
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("invalid analysis links resolve to an unavailable state", async ({ page }) => {
  await page.goto("/home?analysis=not-a-real-analysis");
  await expect(page.getByText("Analysis unavailable.", { exact: false })).toBeVisible();
});

test("export starts a JSON download", async ({ page }) => {
  await page.goto("/");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export analysis" }).click();
  expect((await download).suggestedFilename()).toMatch(/threadhunt-walkthrough\.json$/);
});
test("mobile page stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Import repository" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle workspace sidebar" }).click();
  await expect(page.locator("#workspace-sidebar")).toBeVisible();
  await page.getByRole("button", { name: "Toggle workspace sidebar" }).click();
  await expect(page.locator("#workspace-sidebar")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../repolens-mobile.png", fullPage: false });
});
