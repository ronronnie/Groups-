import { NextResponse } from "next/server";
import { z } from "zod";
import { ChatModerationError } from "@/domains/chat/policy";
import { getCurrentUser } from "@/server/auth/current-user";
import { createChatSqlExecutor } from "@/server/chat/database";
import {
  createGeneralChatMessage,
  listGeneralChatMessages,
} from "@/server/chat/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ body: z.string() });

function unauthorized() {
  return NextResponse.json(
    { error: "Authentication is required." },
    { status: 401 },
  );
}

function forbidden() {
  return NextResponse.json(
    { error: "You cannot access this group chat." },
    { status: 403 },
  );
}

function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const { groupId } = await context.params;
    const messages = await listGeneralChatMessages(createChatSqlExecutor(), {
      groupId,
      viewerId: user.id,
    });

    return messages ? NextResponse.json({ messages }) : forbidden();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid group." }, { status: 400 });
    }
    throw error;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { error: "This request did not come from the application." },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const { groupId } = await context.params;
    const input = bodySchema.parse(await request.json());
    const message = await createGeneralChatMessage(createChatSqlExecutor(), {
      groupId,
      authorId: user.id,
      body: input.body,
    });

    return message
      ? NextResponse.json({ message }, { status: 201 })
      : forbidden();
  } catch (error) {
    if (error instanceof ChatModerationError) {
      return NextResponse.json(
        { error: error.message, flags: error.flags },
        { status: error.status },
      );
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Write a valid message under 2,000 characters." },
        { status: 400 },
      );
    }
    throw error;
  }
}
