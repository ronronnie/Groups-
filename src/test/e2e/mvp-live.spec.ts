import { expect, test, type Page } from "@playwright/test";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });

const live = process.env.PLAYWRIGHT_LIVE === "1";
const password = "GroupsTest123!";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ownerEmail = `e2e.owner.${runId}@example.test`;
const memberEmail = `e2e.member.${runId}@example.test`;
const groupName = `E2E Jobs ${runId}`;
const jobUrl = `https://jobs.example.test/${runId}`;
const jobTitle = `Senior Product Designer ${runId}`;
const discussionMessage = `Is the design team involved early? ${runId}`;
const chatMessage = `The referral workflow is ready for review. ${runId}`;

test.skip(
  !live,
  "Requires configured live integrations and a development database.",
);
test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

function monitorPage(page: Page, failures: string[]) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      failures.push(`console error: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) =>
    failures.push(`page error: ${error.message}`),
  );
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "unknown";
    if (errorText === "net::ERR_ABORTED") return;
    failures.push(
      `request failed: ${request.method()} ${request.url()} (${errorText})`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      failures.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });
}

async function signUp(page: Page, name: string, email: string) {
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/auth/sign-up/email"),
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Create account" }).click();
  const response = await responsePromise;
  const responseText = await response.text();
  expect(
    response.status(),
    `Sign-up returned ${response.status()}: ${responseText}`,
  ).toBeLessThan(400);
}

async function completeProfile(
  page: Page,
  input: { name: string; role: string; company: string },
) {
  await page.goto("/app/profile/setup");
  await page.getByLabel("Display name").fill(input.name);
  await page
    .getByLabel("Headline")
    .fill(`${input.role} focused on useful products`);
  await page.getByLabel("Current role").fill(input.role);
  await page.getByLabel("Company (optional)").fill(input.company);
  await page.getByRole("spinbutton", { name: "Years of experience" }).fill("7");
  await page
    .getByRole("textbox", { name: "Current location" })
    .fill("Bengaluru, India");
  await page
    .getByRole("textbox", { name: "Skills", exact: true })
    .fill("Product Design, Research, Figma");
  await page
    .getByLabel("Desired roles")
    .fill("Senior Product Designer, Design Lead");
  await page.getByLabel("Preferred locations").fill("Bengaluru, Remote");
  await page.getByLabel("Work preference").selectOption("hybrid");
  await page.getByLabel("My groups").check();
  await page.getByLabel("Current company", { exact: true }).check();
  await page.getByRole("button", { name: "Complete profile" }).click();
  await expect(page).toHaveURL(/\/app\/profile\?saved=1$/, {
    timeout: 30_000,
  });
}

test.afterAll(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  const sql = neon(databaseUrl);
  const testUsers = await sql`
    select id from users where email in (${ownerEmail}, ${memberEmail})
  `;
  const userIds = testUsers.map((row) => String(row.id));

  if (userIds.length) {
    await sql`delete from groups where owner_id = any(${userIds})`;
    await sql`delete from applications where user_id = any(${userIds})`;
  }
  await sql`delete from users where email in (${ownerEmail}, ${memberEmail})`;
  await sql`delete from jobs where canonical_url = ${jobUrl}`;
});

test("runs the account, group, invite, and profile journey", async ({
  browser,
}) => {
  const failures: string[] = [];
  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const member = await memberContext.newPage();
  monitorPage(owner, failures);
  monitorPage(member, failures);

  await owner.goto("/sign-up");
  await signUp(owner, "E2E Owner", ownerEmail);
  await expect(owner).toHaveURL(/\/app$/, { timeout: 30_000 });
  await expect(
    owner.getByRole("heading", { name: "Turn opportunities into action." }),
  ).toBeVisible();

  await completeProfile(owner, {
    name: "E2E Owner",
    role: "Senior Product Designer",
    company: "E2E Studio",
  });

  await owner.goto("/app/groups/new");
  await owner.getByLabel("Group name").fill(groupName);
  await owner.getByRole("button", { name: "Create group" }).click();
  await expect(owner).toHaveURL(/\/app\/groups\/[^/]+\/invites\?token=/, {
    timeout: 30_000,
  });
  await expect(
    owner.getByRole("heading", { name: "Invite people" }),
  ).toBeVisible();
  const invitePath = await owner.getByLabel("Invite link").inputValue();
  const groupSlug = new URL(owner.url()).pathname.split("/")[3];
  expect(invitePath).toMatch(/^\/join\//);
  expect(groupSlug).toBeTruthy();

  await member.goto(invitePath);
  await expect(member.getByRole("heading", { name: groupName })).toBeVisible();
  await member.getByRole("link", { name: "Create an account" }).click();
  await signUp(member, "E2E Member", memberEmail);
  await expect(member).toHaveURL(new RegExp(`${invitePath}$`), {
    timeout: 30_000,
  });
  await member.getByRole("button", { name: "Join group" }).click();
  await expect(member).toHaveURL(
    new RegExp(`/app/groups/${groupSlug}/for-you$`),
    { timeout: 30_000 },
  );

  await completeProfile(member, {
    name: "E2E Member",
    role: "Product Designer",
    company: "E2E Company",
  });

  await owner.goto(`/app/groups/${groupSlug}/people`);
  await expect(owner.getByText("E2E Member", { exact: true })).toBeVisible();
  await expect(
    owner.getByText("Product Designer at E2E Company", { exact: true }),
  ).toBeVisible();
  const memberCard = owner.locator("article").filter({ hasText: "E2E Member" });
  await memberCard.getByRole("link", { name: "View profile" }).click();
  await expect(
    owner.getByRole("heading", { name: "E2E Member" }),
  ).toBeVisible();
  await expect(
    owner.getByText("Product Designer", { exact: true }),
  ).toBeVisible();

  await member.goto(`/app/groups/${groupSlug}/settings`);
  await expect(
    member.getByRole("heading", { name: "This page is not here." }),
  ).toBeVisible();
  await expect(
    member.getByRole("heading", { name: "Group management" }),
  ).toHaveCount(0);
  await owner.goto(`/app/groups/${groupSlug}/settings`);
  await expect(
    owner.getByRole("heading", { name: "Group management" }),
  ).toBeVisible();
  await owner.getByRole("link", { name: "Members", exact: true }).click();
  await expect(owner.getByText("E2E Member", { exact: true })).toBeVisible();
  await owner.getByRole("link", { name: "Moderation" }).click();
  await expect(
    owner.getByRole("heading", { name: "Moderation" }),
  ).toBeVisible();

  await member.goto(`/app/groups/${groupSlug}/jobs`);
  await member.getByLabel("Job URL").fill(jobUrl);
  await member
    .getByLabel("Job description (optional)")
    .fill(
      "E2E Company is hiring a senior product designer in Bengaluru. The role partners with research and engineering to build accessible products using Figma and design systems.",
    );
  await member.getByLabel("Role title (optional)").fill(jobTitle);
  await member.getByLabel("Company (optional)").fill("E2E Company");
  await member
    .getByLabel("Note to the group (optional)")
    .fill("I work here and can share context about the team.");
  await member.getByRole("button", { name: "Review job" }).click();
  await expect(
    member.getByRole("heading", { name: "Review job details" }),
  ).toBeVisible({ timeout: 60_000 });
  await member.getByLabel("Role title", { exact: true }).fill(jobTitle);
  await member.getByLabel("Company", { exact: true }).fill("E2E Company");
  await member
    .getByLabel("Description summary")
    .fill("Design accessible products with research and engineering.");
  await member.getByLabel("Location").fill("Bengaluru, India");
  await member.getByLabel("Work mode").selectOption("hybrid");
  await member.getByLabel("Skills").fill("Product Design, Research, Figma");
  await member.getByRole("button", { name: "Share job" }).click();
  await expect(member.getByText("Job shared with the group.")).toBeVisible({
    timeout: 30_000,
  });
  const jobLink = member.getByRole("link", { name: jobTitle, exact: true });
  await expect(jobLink).toBeVisible({ timeout: 30_000 });
  await jobLink.click();
  await expect(member).toHaveURL(
    new RegExp(`/app/groups/${groupSlug}/jobs/[0-9a-f-]+$`),
  );
  const jobId = new URL(member.url()).pathname.split("/").at(-1);
  expect(jobId).toBeTruthy();

  await member.getByLabel("Add to this discussion").fill(discussionMessage);
  await member.getByRole("button", { name: "Post message" }).click();
  await expect(member.getByText("Message posted.")).toBeVisible({
    timeout: 30_000,
  });

  await owner.goto(`/app/groups/${groupSlug}/for-you`);
  const ownerJobCard = owner.locator("article").filter({ hasText: jobTitle });
  await expect(ownerJobCard).toBeVisible({ timeout: 30_000 });
  await ownerJobCard.getByRole("button", { name: "Save" }).click();
  await expect(ownerJobCard.getByRole("button", { name: "Saved" })).toBeVisible(
    { timeout: 30_000 },
  );
  await ownerJobCard.getByRole("button", { name: "Mark applied" }).click();
  await expect(ownerJobCard.getByText("Applied", { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  await member.goto(`/app/groups/${groupSlug}/tracker`);
  await expect(
    member.getByRole("heading", { name: "No applications yet" }),
  ).toBeVisible();

  await owner.goto(`/app/groups/${groupSlug}/tracker`);
  const trackerCard = owner.locator("article").filter({ hasText: jobTitle });
  await expect(trackerCard).toBeVisible({ timeout: 30_000 });
  await trackerCard
    .getByRole("combobox", { name: "Application status" })
    .selectOption("interviewing");
  await trackerCard.getByRole("button", { name: "Move" }).click();
  await expect(
    trackerCard.getByText("Interviewing", { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await trackerCard.getByText("Notes and next action", { exact: true }).click();
  await trackerCard
    .getByLabel("Next action")
    .fill("Prepare the portfolio case study");
  await trackerCard
    .getByLabel("Private notes")
    .fill("Do not expose this note to the group.");
  await trackerCard.getByRole("button", { name: "Save details" }).click();
  await expect(trackerCard.getByText("Private details saved.")).toBeVisible({
    timeout: 30_000,
  });

  await owner.goto(`/app/groups/${groupSlug}/jobs/${jobId}`);
  await expect(
    owner.getByText(discussionMessage, { exact: true }),
  ).toBeVisible();
  await expect(
    owner
      .getByRole("region", { name: "Referral" })
      .getByRole("radio", { name: /E2E Member/ }),
  ).toBeVisible();
  await owner
    .getByLabel("Private message")
    .fill(
      "Your company matches this role. Would you be comfortable referring me?",
    );
  await owner.getByRole("button", { name: "Request referral" }).click();
  await expect(owner.getByText("Referral request sent privately.")).toBeVisible(
    {
      timeout: 30_000,
    },
  );

  await member.goto(`/app/groups/${groupSlug}/referrals`);
  const referralCard = member.locator("article").filter({ hasText: jobTitle });
  await expect(referralCard).toBeVisible({ timeout: 30_000 });
  await referralCard.getByRole("button", { name: "Accept" }).click();
  await expect(
    referralCard.getByText("Accepted", { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await referralCard.getByRole("button", { name: "Mark referred" }).click();
  await expect(
    referralCard.getByText("Referred", { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });

  await owner.goto(`/app/groups/${groupSlug}/jobs/${jobId}`);
  await owner.getByRole("button", { name: "Ask this Group" }).click();
  const askDialog = owner.getByRole("dialog", { name: "Ask this Group" });
  await askDialog
    .getByRole("textbox", { name: "What do you want to find?" })
    .fill("Which role matches my profile and who may be able to refer me?");
  const askResponsePromise = owner.waitForResponse(
    (response) =>
      response.url().includes(`/api/groups/`) &&
      response.url().endsWith("/ask"),
    { timeout: 60_000 },
  );
  await askDialog.getByRole("button", { name: "Ask Brain" }).click();
  const askResponse = await askResponsePromise;
  expect(askResponse.status()).toBeLessThan(500);
  await expect(askDialog.getByText("Brain", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await askDialog.getByRole("button", { name: "Close" }).click();

  await owner.goto(`/app/groups/${groupSlug}/tracker`);
  const outcomeCard = owner.locator("article").filter({ hasText: jobTitle });
  await outcomeCard.getByText("Record a milestone", { exact: true }).click();
  await outcomeCard
    .getByRole("combobox", { name: "Milestone" })
    .selectOption("interview");
  await outcomeCard.getByLabel("The original job sharer helped me.").check();
  await outcomeCard
    .getByLabel("A completed referral in this group helped me.")
    .check();
  await outcomeCard
    .getByLabel("I confirm this milestone happened to me.")
    .check();
  await outcomeCard.getByRole("button", { name: "Save privately" }).click();
  await expect(
    outcomeCard.getByText("Milestone saved privately. Nothing was announced."),
  ).toBeVisible({ timeout: 30_000 });
  await outcomeCard.getByRole("link", { name: "Review outcome" }).click();
  const outcome = owner.locator("article").filter({ hasText: jobTitle });
  await expect(outcome.getByText("Private", { exact: true })).toBeVisible();
  await outcome
    .getByLabel(/I confirm the attribution above and consent to share/)
    .check();
  await outcome.getByRole("button", { name: "Share with group" }).click();
  await expect(
    outcome.getByText("Outcome shared with this group.", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await member.goto(`/app/groups/${groupSlug}/outcomes?view=group`);
  await expect(
    member.locator("article").filter({ hasText: jobTitle }),
  ).toBeVisible({
    timeout: 30_000,
  });

  await owner.goto(`/app/groups/${groupSlug}/digest`);
  await expect(
    owner.getByRole("heading", { name: "Your group catch-up" }),
  ).toBeVisible();
  await owner.goto("/app/notifications");
  await expect(
    owner.getByRole("heading", { name: "Notifications" }),
  ).toBeVisible();
  await owner.goto("/app/settings/notifications");
  await owner.getByRole("combobox").selectOption("weekly");
  await owner.getByRole("button", { name: "Save preferences" }).click();
  await expect(owner).toHaveURL(/\/app\/settings\/notifications\?saved=1$/);
  await expect(owner.getByText("Preferences saved.")).toBeVisible();
  await owner.goto("/app/settings/account");
  await expect(
    owner.getByRole("button", { name: "Delete account" }),
  ).toBeDisabled();

  await member.goto(`/app/groups/${groupSlug}/chat`);
  await expect(member.getByText("Live", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await member.getByLabel("Message the group").fill(chatMessage);
  await member.getByRole("button", { name: "Send message" }).click();
  await expect(member.getByText(chatMessage, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await owner.goto(`/app/groups/${groupSlug}/chat`);
  await expect(owner.getByText(chatMessage, { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  await owner.setViewportSize({ width: 320, height: 800 });
  await owner.goto(`/app/groups/${groupSlug}/for-you`);
  await expect
    .poll(() =>
      owner.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);

  expect(failures).toEqual([]);

  await ownerContext.close();
  await memberContext.close();
});
