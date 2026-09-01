import OpenAI from "openai";
import { getServerEnv } from "@/config/env.server";

export function createOpenAIClient(apiKey = getServerEnv().OPENAI_API_KEY) {
  return new OpenAI({ apiKey });
}

export function getOpenAIModelConfig() {
  const env = getServerEnv();

  return {
    responseModel: env.OPENAI_MODEL,
    embeddingModel: env.OPENAI_EMBEDDING_MODEL,
  };
}
