import { test, expect } from "@playwright/test";
test("example is real, navigable, and linked to pinned source", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "See the system." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "View source" })).toHaveAttribute(
    "href",
    /github\.com\/deepdotspace\/threadhunt\/blob\/[a-f0-9]{40}\//,
  );
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
