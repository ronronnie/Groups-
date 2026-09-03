import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatTranscript } from "@/features/chat/components/general-chat";
import { renderWithApp } from "@/test/render";

const currentUserId = "80000000-0000-4000-8000-000000000101";

describe("ChatTranscript", () => {
  it("shows a focused empty state that keeps job discussion separate", () => {
    renderWithApp(
      <ChatTranscript currentUserId={currentUserId} messages={[]} />,
    );

    expect(
      screen.getByRole("heading", { name: "Start the conversation" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/attached to each job/i)).toBeInTheDocument();
  });

  it("shows sender identity, message text, and a timestamp", () => {
    renderWithApp(
      <ChatTranscript
        currentUserId={currentUserId}
        messages={[
          {
            id: "80000000-0000-4000-8000-000000000301",
            authorId: currentUserId,
            authorName: "Current User",
            body: "I can make the introduction.",
            createdAt: new Date("2026-09-03T10:30:00Z"),
          },
          {
            id: "80000000-0000-4000-8000-000000000302",
            authorId: "80000000-0000-4000-8000-000000000102",
            authorName: "Priya Shah",
            body: "Thank you. I will send the role details.",
            createdAt: new Date("2026-09-03T10:31:00Z"),
          },
        ]}
      />,
    );

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Priya Shah")).toBeInTheDocument();
    expect(screen.getAllByRole("time")).toHaveLength(2);
    expect(
      screen.getByText("I can make the introduction."),
    ).toBeInTheDocument();
  });
});
