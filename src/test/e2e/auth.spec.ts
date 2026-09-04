import { expect, test } from "@playwright/test";

test("protected routes redirect to sign in", async ({ page }) => {
  await page.goto("/app/settings/account");

  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp%2Fsettings%2Faccount$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("authentication pages expose the required methods", async ({ page }) => {
  await page.goto("/sign-up");

  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("sign up stays usable at 320px with keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/sign-up");

  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toHaveCSS(
    "height",
    "40px",
  );

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Groups" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeFocused();
});

test("private outcome routes require authentication", async ({ page }) => {
  await page.goto("/app/groups/example/outcomes");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("group administration routes require authentication", async ({ page }) => {
  await page.goto("/app/groups/example/settings?tab=moderation");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Group management" }),
  ).toHaveCount(0);
});
