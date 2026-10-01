import { test, expect } from "@playwright/test";
test("paid actions require authentication", async ({ request }) => {
  for (const action of [
    "analyze-repository",
    "ask-source",
    "narrate-tour",
    "publish-analysis",
    "invite-reviewer",
  ]) {
    const r = await request.post(`/api/actions/${action}`, { data: {} });
    expect(r.status()).toBe(401);
  }
});
test("generic integration proxy cannot bypass usage limits", async ({
  request,
}) => {
  const r = await request.post("/api/integrations/anthropic/chat-completion", {
    data: { messages: [] },
  });
  expect(r.status()).toBe(403);
});
