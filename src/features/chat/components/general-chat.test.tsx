import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ChatTranscript,
  GeneralChat,
} from "@/features/chat/components/general-chat";
import { renderWithApp } from "@/test/render";

const realtimeInstances = vi.hoisted(
  () => [] as Array<{ close: ReturnType<typeof vi.fn> }>,
);

vi.mock("ably", () => ({
  Realtime: class {
    close = vi.fn();

    constructor() {
      realtimeInstances.push(this);
    }
  },
}));
vi.mock("@ably/chat", () => ({
  ChatClient: class {},
  ConnectionStatus: {
    Connected: "connected",
    Disconnected: "disconnected",
    Failed: "failed",
    Suspended: "suspended",
  },
  LogLevel: { Error: "error" },
  RoomStatus: {
    Attached: "attached",
    Failed: "failed",
    Suspended: "suspended",
  },
}));
vi.mock("@ably/chat/react", () => ({
  ChatClientProvider: ({ children }: { children: ReactNode }) => children,
  ChatRoomProvider: ({ children }: { children: ReactNode }) => children,
  useMessages: () => ({
    connectionStatus: "connected",
    roomStatus: "attached",
    sendMessage: vi.fn(),
  }),
}));
vi.mock("@/server/groups/admin-actions", () => ({ groupAdminAction: vi.fn() }));

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

  it("recreates the realtime client after a Strict Mode effect cleanup", async () => {
    HTMLElement.prototype.scrollTo = vi.fn();
    render(
      <StrictMode>
        <GeneralChat
          currentUserId={currentUserId}
          groupId="80000000-0000-4000-8000-000000000201"
          initialMessages={[]}
        />
      </StrictMode>,
    );

    await waitFor(() => expect(realtimeInstances).toHaveLength(2));
    expect(
      await screen.findByText("Live", { exact: true }),
    ).toBeInTheDocument();
    expect(realtimeInstances[0]?.close).toHaveBeenCalledOnce();
    expect(realtimeInstances[1]?.close).not.toHaveBeenCalled();
  });
});
