import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithApp } from "@/test/render";
import { groupSettingsSchema } from "@/domains/groups/admin";
import {
  GroupSettingsForm,
  MemberControls,
  ReportContentForm,
} from "@/features/groups/components/admin-forms";
import { groupAdminAction } from "@/server/groups/admin-actions";
vi.mock("@/server/groups/admin-actions", () => ({ groupAdminAction: vi.fn() }));
afterEach(cleanup);
const groupId = "10000000-0000-4000-8000-000000000010";
const member = {
  userId: "10000000-0000-4000-8000-000000000011",
  name: "Member",
  role: "member" as const,
  status: "active" as const,
};
beforeEach(() =>
  vi
    .mocked(groupAdminAction)
    .mockResolvedValue({ error: null, success: "Changes saved." }),
);
describe("group administration controls", () => {
  it("edits centralized settings without an engine control", async () => {
    const user = userEvent.setup();
    renderWithApp(
      <GroupSettingsForm
        groupId={groupId}
        name="Jobs team"
        settings={groupSettingsSchema.parse({})}
      />,
    );
    expect(
      screen.queryByRole("combobox", { name: /engine/i }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: "Group name" }));
    await user.type(
      screen.getByRole("textbox", { name: "Group name" }),
      "New name",
    );
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Changes saved.",
    );
    const form = vi.mocked(groupAdminAction).mock.calls.at(-1)![1];
    expect(form.get("name")).toBe("New name");
    expect(form.get("engineKey")).toBeNull();
  });
  it("does not offer owner or self-removal", () => {
    renderWithApp(
      <MemberControls
        groupId={groupId}
        actorId={member.userId}
        actorRole="owner"
        member={{ ...member, role: "owner" }}
      />,
    );
    expect(screen.queryByText(/Manage/)).not.toBeInTheDocument();
  });
  it("requires confirmation to remove a member and hides role control from admins", async () => {
    const user = userEvent.setup();
    renderWithApp(
      <MemberControls
        groupId={groupId}
        actorId="owner-id"
        actorRole="admin"
        member={member}
      />,
    );
    await user.click(screen.getByText("Manage Member"));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeRequired();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Remove member" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Changes saved.",
    );
  });
  it("submits scoped reports and displays safe errors", async () => {
    vi.mocked(groupAdminAction).mockResolvedValueOnce({
      error: "Report unavailable.",
      success: null,
    });
    const user = userEvent.setup();
    renderWithApp(
      <ReportContentForm
        groupId={groupId}
        targetId={member.userId}
        targetType="message"
      />,
    );
    await user.click(screen.getByText("Report"));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Reason" }),
      "spam",
    );
    await user.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Report unavailable.",
    );
    const form = vi.mocked(groupAdminAction).mock.calls.at(-1)![1];
    expect(form.get("groupId")).toBe(groupId);
    expect(form.get("targetType")).toBe("message");
    expect(form.get("reason")).toBe("spam");
  });
});
