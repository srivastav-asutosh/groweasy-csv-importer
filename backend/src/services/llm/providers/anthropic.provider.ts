import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../../config/env.js";
import type { RawCsvRow } from "../../../types/crm.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "../prompt.js";
import { RECORD_SCHEMA_PROPERTIES, RECORD_REQUIRED_FIELDS } from "../schema.js";
import { LlmProviderError, type LlmProvider, type RawExtractedRecord } from "../types.js";

const EXTRACT_TOOL_NAME = "submit_crm_records";

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string = env.anthropicApiKey, private model: string = env.llmModel) {
    if (!apiKey) {
      throw new LlmProviderError("ANTHROPIC_API_KEY is not set.");
    }
    this.client = new Anthropic({ apiKey });
  }

  async extractBatch(rows: RawCsvRow[], startIndex: number): Promise<RawExtractedRecord[]> {
    try {
      // Claude has no dedicated "JSON mode", so we force structured output via tool use:
      // the model must call submit_crm_records with arguments matching our schema.
      const message = await this.client.messages.create({
        model: this.model || "claude-3-5-sonnet-latest",
        max_tokens: 8192,
        temperature: 0,
        system: SYSTEM_PROMPT,
        tools: [
          {
            name: EXTRACT_TOOL_NAME,
            description: "Submit the extracted GrowEasy CRM records for this batch of CSV rows.",
            input_schema: {
              type: "object",
              properties: {
                records: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: RECORD_SCHEMA_PROPERTIES,
                    required: RECORD_REQUIRED_FIELDS,
                  },
                },
              },
              required: ["records"],
            },
          },
        ],
        tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
        messages: [{ role: "user", content: buildUserPrompt(rows, startIndex) }],
      });

      const toolUse = message.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      if (!toolUse) {
        throw new Error("Claude did not return a tool_use block.");
      }
      const input = toolUse.input as { records?: RawExtractedRecord[] };
      if (!Array.isArray(input.records)) {
        throw new Error('Tool input did not contain a "records" array.');
      }
      return input.records;
    } catch (err) {
      throw new LlmProviderError(`Anthropic extraction failed: ${(err as Error).message}`, err);
    }
  }
}
