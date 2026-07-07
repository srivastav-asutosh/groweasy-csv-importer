import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../../config/env.js";
import type { RawCsvRow } from "../../../types/crm.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "../prompt.js";
import { parseRecordsResponse } from "../jsonExtract.js";
import { LlmProviderError, type LlmProvider, type RawExtractedRecord } from "../types.js";

export class GeminiProvider implements LlmProvider {
  readonly name = "gemini";
  private client: GoogleGenerativeAI;

  constructor(apiKey: string = env.geminiApiKey, private model: string = env.llmModel) {
    if (!apiKey) {
      throw new LlmProviderError("GEMINI_API_KEY is not set.");
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async extractBatch(rows: RawCsvRow[], startIndex: number): Promise<RawExtractedRecord[]> {
    try {
      const generativeModel = this.client.getGenerativeModel({
        model: this.model || "gemini-2.0-flash",
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      });

      const result = await generativeModel.generateContent(buildUserPrompt(rows, startIndex));
      const text = result.response.text();
      return parseRecordsResponse(text);
    } catch (err) {
      throw new LlmProviderError(`Gemini extraction failed: ${(err as Error).message}`, err);
    }
  }
}
