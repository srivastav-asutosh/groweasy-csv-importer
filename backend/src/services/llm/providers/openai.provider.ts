import OpenAI from "openai";
import { env } from "../../../config/env.js";
import type { RawCsvRow } from "../../../types/crm.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "../prompt.js";
import { parseRecordsResponse } from "../jsonExtract.js";
import { LlmProviderError, type LlmProvider, type RawExtractedRecord } from "../types.js";

export class OpenAiProvider implements LlmProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string = env.openaiApiKey, private model: string = env.llmModel) {
    if (!apiKey) {
      throw new LlmProviderError("OPENAI_API_KEY is not set.");
    }
    this.client = new OpenAI({ apiKey });
  }

  async extractBatch(rows: RawCsvRow[], startIndex: number): Promise<RawExtractedRecord[]> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(rows, startIndex) },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      return parseRecordsResponse(text);
    } catch (err) {
      throw new LlmProviderError(`OpenAI extraction failed: ${(err as Error).message}`, err);
    }
  }
}
