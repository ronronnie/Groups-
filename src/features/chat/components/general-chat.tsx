"use client";

import {
  ChatClient,
  ConnectionStatus,
  LogLevel,
  RoomStatus,
  type RoomOptions,
} from "@ably/chat";
import {
  ChatClientProvider,
  ChatRoomProvider,
  useMessages,
} from "@ably/chat/react";
import * as Ably from "ably";
import { CircleAlert, LoaderCircle, MessageCircle, Send } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { getGeneralChatRoomName } from "@/domains/chat/policy";
import type { GeneralChatMessage } from "@/server/chat/service";
import { ReportContentForm } from "@/features/groups/components/admin-forms";

type ChatClients = {
  chat: ChatClient;
  realtime: Ably.Realtime;
};

type GeneralChatProps = {
  currentUserId: string;
  groupId: string;
  initialMessages: GeneralChatMessage[];
};

type MessageResponse = {
  message: Omit<GeneralChatMessage, "createdAt"> & { createdAt: string };
};

type MessagesResponse = {
  messages: Array<
    Omit<GeneralChatMessage, "createdAt"> & { createdAt: string }
  >;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const roomOptions: RoomOptions = {
  presence: { enableEvents: false },
};

const subscribeToBrowser = () => () => undefined;

function parseMessage(
  message: Omit<GeneralChatMessage, "createdAt"> & { createdAt: string },
): GeneralChatMessage {
  return { ...message, createdAt: new Date(message.createdAt) };
}

async function getErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return payload?.error ?? fallback;
}

export function ChatTranscript({
  currentUserId,
  messages,
  groupId,
}: Readonly<{
  currentUserId: string;
  messages: GeneralChatMessage[];
  groupId?: string;
}>) {
  if (!messages.length) {
    return (
      <EmptyState
        className="min-h-64 border-x-0"
        description="Use general chat for quick coordination. Keep role-specific questions attached to each job."
        icon={MessageCircle}
        title="Start the conversation"
      />
    );
  }

  return (
    <ol className="divide-y" data-testid="chat-transcript">
      {messages.map((message) => {
        const isOwnMessage = message.authorId === currentUserId;
        return (
          <li className="flex gap-3 px-4 py-5 sm:px-6" key={message.id}>
            <Avatar alt={message.authorName} className="size-9" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">
                  {isOwnMessage ? "You" : message.authorName}
                </p>
                <time
                  className="font-secondary text-xs text-muted-foreground"
                  dateTime={message.createdAt.toISOString()}
                >
                  {dateFormatter.format(message.createdAt)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words font-secondary text-sm leading-6">
                {message.body}
              </p>
              {groupId && (
                <ReportContentForm
                  groupId={groupId}
                  targetId={message.id}
                  targetType="message"
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ChatRoom({
  currentUserId,
  groupId,
  initialMessages,
}: GeneralChatProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const messagesEndpoint = `/api/groups/${groupId}/chat/messages`;

  const refreshMessages = useCallback(async () => {
    const response = await fetch(messagesEndpoint, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (response.status === 401 || response.status === 403) {
      setMessages([]);
      setAccessRevoked(true);
      setNotice("You no longer have access to this chat.");
      return;
    }
    if (!response.ok) throw new Error("Unable to refresh messages.");
    const payload = (await response.json()) as MessagesResponse;
    setMessages(payload.messages.map(parseMessage));
  }, [messagesEndpoint]);

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) void refreshMessages().catch(() => undefined);
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refreshMessages]);

  const { connectionStatus, roomStatus, sendMessage } = useMessages({
    listener: () => void refreshMessages().catch(() => undefined),
    onDiscontinuity: () => void refreshMessages().catch(() => undefined),
  });

  const isLive =
    !accessRevoked &&
    connectionStatus === ConnectionStatus.Connected &&
    roomStatus === RoomStatus.Attached;
  const isUnavailable =
    accessRevoked ||
    connectionStatus === ConnectionStatus.Failed ||
    roomStatus === RoomStatus.Failed;
  const statusLabel = isLive
    ? "Live"
    : isUnavailable
      ? "Chat unavailable"
      : connectionStatus === ConnectionStatus.Disconnected ||
          connectionStatus === ConnectionStatus.Suspended ||
          roomStatus === RoomStatus.Suspended
        ? "Reconnecting"
        : "Connecting";

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      behavior: "smooth",
      top: transcriptRef.current.scrollHeight,
    });
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLive || submitting) return;

    setSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch(messagesEndpoint, {
        body: JSON.stringify({ body }),
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Your message could not be sent."),
        );
      }

      const payload = (await response.json()) as MessageResponse;
      const savedMessage = parseMessage(payload.message);
      setMessages((current) =>
        current.some((message) => message.id === savedMessage.id)
          ? current
          : [...current, savedMessage],
      );
      setBody("");

      try {
        await sendMessage({
          metadata: { kind: "persisted-general-message" },
          // Realtime events only invalidate the server-authorized DB transcript.
          text: savedMessage.id,
        });
      } catch {
        setNotice(
          "Message saved. Live delivery is reconnecting; members will see it after refresh.",
        );
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Your message could not be sent.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="general-chat-heading"
      className="mx-auto max-w-4xl overflow-hidden border bg-surface shadow-xs"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-surface-subtle px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-2xl font-bold" id="general-chat-heading">
            General chat
          </h2>
          <p className="mt-1 font-secondary text-sm text-muted-foreground">
            Quick coordination for this group. Job discussions stay with their
            jobs.
          </p>
        </div>
        <p
          aria-live="polite"
          className="flex items-center gap-2 font-secondary text-xs font-bold text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${isLive ? "bg-success" : isUnavailable ? "bg-destructive" : "bg-warning"}`}
          />
          {statusLabel}
        </p>
      </header>

      <div
        className="max-h-[55vh] min-h-64 overflow-y-auto"
        ref={transcriptRef}
      >
        <ChatTranscript
          currentUserId={currentUserId}
          messages={messages}
          groupId={groupId}
        />
      </div>

      <form
        className="border-t bg-background p-4 sm:p-6"
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor="general-chat-message">
          Message the group
        </label>
        <div className="flex items-end gap-2">
          <Textarea
            className="min-h-12 resize-none font-secondary"
            disabled={!isLive || submitting}
            id="general-chat-message"
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
            placeholder={isLive ? "Message the group" : `${statusLabel}...`}
            required
            rows={2}
            value={body}
          />
          <Button
            aria-label="Send message"
            className="size-12 px-0"
            disabled={!isLive || submitting || !body.trim()}
            type="submit"
          >
            {submitting ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            ) : (
              <Send aria-hidden="true" className="size-5" />
            )}
          </Button>
        </div>
        {notice ? (
          <p
            className="mt-3 flex items-center gap-2 font-secondary text-sm text-destructive"
            role="alert"
          >
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            {notice}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function RealtimeGeneralChat(props: Readonly<GeneralChatProps>) {
  const [clients] = useState<ChatClients>(() => {
    const realtime = new Ably.Realtime({
      authMethod: "GET",
      authUrl: `/api/groups/${props.groupId}/chat/token`,
    });
    const chat = new ChatClient(realtime, { logLevel: LogLevel.Error });
    return { chat, realtime };
  });

  useEffect(() => () => clients.realtime.close(), [clients]);

  return (
    <ChatClientProvider client={clients.chat}>
      <ChatRoomProvider
        name={getGeneralChatRoomName(props.groupId)}
        options={roomOptions}
      >
        <ChatRoom {...props} />
      </ChatRoomProvider>
    </ChatClientProvider>
  );
}

export function GeneralChat(props: Readonly<GeneralChatProps>) {
  const isBrowser = useSyncExternalStore(
    subscribeToBrowser,
    () => true,
    () => false,
  );

  return isBrowser ? (
    <RealtimeGeneralChat key={props.groupId} {...props} />
  ) : (
    <LoadingState label="Connecting to group chat" />
  );
}
