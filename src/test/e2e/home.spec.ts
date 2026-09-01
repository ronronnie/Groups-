import { expect, test } from "@playwright/test";

test("home page and health endpoint are reachable", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /purpose-native groups, ready for implementation/i,
    }),
  ).toBeVisible();

  const response = await page.request.get("/api/health");
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({
    ok: true,
    app: "Groups",
  });
});
