import { env } from "../../config/env.js";
import { OpenAiProvider } from "./providers/openai.provider.js";
import { GeminiProvider } from "./providers/gemini.provider.js";
import { AnthropicProvider } from "./providers/anthropic.provider.js";
import { MockProvider } from "./providers/mock.provider.js";
import type { LlmProvider } from "./types.js";

let cachedProvider: LlmProvider | undefined;

export function getLlmProvider(): LlmProvider {
  if (cachedProvider) return cachedProvider;

  switch (env.llmProvider) {
    case "openai":
      cachedProvider = new OpenAiProvider();
      break;
    case "gemini":
      cachedProvider = new GeminiProvider();
      break;
    case "anthropic":
      cachedProvider = new AnthropicProvider();
      break;
    case "mock":
      cachedProvider = new MockProvider();
      break;
    default:
      throw new Error(
        `Unknown LLM_PROVIDER "${env.llmProvider}". Expected one of: openai, gemini, anthropic, mock.`
      );
  }
  return cachedProvider;
}

export type { LlmProvider, RawExtractedRecord } from "./types.js";
export { LlmProviderError } from "./types.js";
