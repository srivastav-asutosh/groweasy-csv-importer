import type { RawCsvRow } from "../../types/crm.js";

/** One raw record as returned by the model, before validation/sanitization. */
export interface RawExtractedRecord {
  row_index: number;
  skip?: boolean;
  [field: string]: unknown;
}

export interface LlmProvider {
  /** Human-readable provider name, surfaced in logs/errors. */
  readonly name: string;
  /** Extracts CRM records for one batch of rows. Must return one entry per input row. */
  extractBatch(rows: RawCsvRow[], startIndex: number): Promise<RawExtractedRecord[]>;
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}
