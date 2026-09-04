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

test("private outcome routes require authentication", async ({ page }) => {
  await page.goto("/app/groups/example/outcomes");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
