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
  await expect(page.locator(".rl-module")).toHaveCount(4);
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
  await expect(
    page.getByRole("link", { name: "Open on GitHub" }),
  ).toBeVisible();
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
