import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { createChatSqlExecutor } from "@/server/chat/database";
import { issueGeneralChatToken } from "@/server/chat/token-service";
import { createAblyTokenIssuer } from "@/server/realtime/ably";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  try {
    const { groupId } = await context.params;
    const tokenRequest = await issueGeneralChatToken(
      createChatSqlExecutor(),
      createAblyTokenIssuer(),
      { groupId, userId: user.id },
    );

    return tokenRequest
      ? NextResponse.json(tokenRequest)
      : NextResponse.json(
          { error: "You cannot access this group chat." },
          { status: 403 },
        );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid group." }, { status: 400 });
    }
    throw error;
  }
}
