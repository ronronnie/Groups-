import { NextResponse } from "next/server";
import { z } from "zod";
import { askGroupQuestionSchema } from "@/domains/search/ask-group";
import { requestGroupAnswer } from "@/server/ai/group-answer";
import { requestGroupEmbeddings } from "@/server/ai/group-embedding";
import { getOpenAIModelConfig } from "@/server/ai/openai";
import { recordAiUsageEvent } from "@/server/ai/usage";
import { getCurrentUser } from "@/server/auth/current-user";
import { createSearchSqlExecutor } from "@/server/search/database";
import { askGroup } from "@/server/search/service";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  question: askGroupQuestionSchema,
  groupSlug: z.string().trim().min(1).max(80),
});

function hasTrustedOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
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
  if (!user) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  try {
    const [{ groupId }, body] = await Promise.all([
      context.params,
      request.json(),
    ]);
    const input = requestSchema.parse(body);
    const execute = createSearchSqlExecutor();
    const models = getOpenAIModelConfig();
    const result = await askGroup(
      input.question,
      { groupId, groupSlug: input.groupSlug, userId: user.id },
      {
        execute,
        embeddingModel: models.embeddingModel,
        responseModel: models.responseModel,
        embed: requestGroupEmbeddings,
        answer: requestGroupAnswer,
        recordUsage: (event) => recordAiUsageEvent(execute, event),
      },
    );

    return result
      ? NextResponse.json(result)
      : NextResponse.json(
          { error: "You cannot search this group." },
          { status: 403 },
        );
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Ask a valid question under 500 characters." },
        { status: 400 },
      );
    }
    throw error;
  }
}
