import { test, expect } from "deepspace/testing";
import type { APIRequestContext } from "@playwright/test";
async function caller(request: APIRequestContext) {
  const r = await request.post("/api/auth/token");
  const { token } = await r.json();
  expect(token).toBeTruthy();
  return async (name: string, data: unknown) => {
    const result = await request.post(`/api/actions/${name}`, {
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
    return result.json();
  };
}
test("real import, private isolation, reviewer sync, publication and revocation", async ({
  users,
  browser,
}) => {
  test.setTimeout(180000);
  const [a, b] = await users(2);
  await Promise.all([a.page.goto("/home"), b.page.goto("/home")]);
  await expect(
    a.page.getByRole("button", { name: "Import repository" }),
  ).toBeVisible();
  const callA = await caller(a.context.request);
  const callB = await caller(b.context.request);
  const invalid = await callA("analyze-repository", {
    repository: "https://localhost/private",
  });
  expect(invalid.success).toBe(false);
  const start = await callA("analyze-repository", {
    repository: "deepdotspace/taskspace",
  });
  expect(start.success).toBe(true);
  const id = start.data.id;
  await expect
    .poll(
      async () => {
        const r = await callA("get-analysis", { id });
        if (r.data?.status === "failed") throw new Error(r.data.message);
        return r.data?.status;
      },
      { timeout: 120000, intervals: [1000, 2000] },
    )
    .toBe("complete");
  const saved = await callA("get-analysis", { id });
  expect(saved.data.analysis.edges.length).toBeGreaterThan(0);
  expect((await callB("get-analysis", { id })).success).toBe(false);
  expect((await callB("publish-analysis", { id })).success).toBe(false);
  await a.page.goto(`/home?analysis=${id}`);
  await expect(a.page.getByText("Commit-pinned analysis")).toBeVisible();
  const invite = await callA("invite-reviewer", { id, email: b.email });
  expect(invite.success).toBe(true);
  await b.page.goto(`/home?analysis=${id}`);
  await expect(b.page.getByText("Commit-pinned analysis")).toBeVisible();
  const title = "Reviewed source tour " + Date.now();
  expect(
    (
      await callB("save-tour", {
        id,
        index: 0,
        title,
        description: "Verified collaboratively.",
      })
    ).success,
  ).toBe(true);
  await a.page
    .getByRole("button", { name: "Walkthrough", exact: true })
    .click();
  await expect(
    a.page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const guest = await browser.newContext();
  const page = await guest.newPage();
  await page.goto(`/home?analysis=${id}`);
  await expect(page.getByText("Curated source example")).toBeVisible();
  expect(
    (await callA("publish-analysis", { id, published: true })).success,
  ).toBe(true);
  await expect(page.getByText("Commit-pinned analysis")).toBeVisible({
    timeout: 15000,
  });
  expect(
    (await callA("publish-analysis", { id, published: false })).success,
  ).toBe(true);
  await expect(page.getByText("Curated source example")).toBeVisible({
    timeout: 15000,
  });
  await guest.close();
});
