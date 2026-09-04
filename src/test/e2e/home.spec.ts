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

test("design system is responsive and keyboard accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/design-system");

  await expect(
    page.getByRole("heading", { name: "Groups design system" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Mobile group navigation" }),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "Open modal" }).click();
  await expect(
    page.getByRole("dialog", { name: "Save this opportunity?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Save this opportunity?" }),
  ).toBeHidden();

  await page.getByRole("button", { name: "Ask", exact: true }).click();
  const askDialog = page.getByRole("dialog", { name: "Ask this Group" });
  await expect(askDialog).toBeVisible();
  await expect(
    askDialog.getByRole("textbox", { name: "What do you want to find?" }),
  ).toBeFocused();
  const askDialogBox = await askDialog.boundingBox();
  expect(askDialogBox?.x).toBeGreaterThanOrEqual(0);
  expect(
    (askDialogBox?.x ?? 0) + (askDialogBox?.width ?? 0),
  ).toBeLessThanOrEqual(320);
  await page.keyboard.press("Escape");
  await expect(askDialog).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("dialog", { name: "Ask this Group" }),
  ).toBeVisible();
});
