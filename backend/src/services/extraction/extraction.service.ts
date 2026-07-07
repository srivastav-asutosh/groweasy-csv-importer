import { env } from "../../config/env.js";
import type { CrmRecord, ImportResult, RawCsvRow, SkippedRecord } from "../../types/crm.js";
import type { LlmProvider } from "../llm/types.js";
import { runWithConcurrency } from "../../utils/concurrencyPool.js";
import { withRetry } from "../../utils/retry.js";
import { rowHasContactInfo, sanitizeRecord } from "./sanitize.js";

export interface ExtractionProgress {
  batchesCompleted: number;
  totalBatches: number;
  rowsProcessed: number;
  totalRows: number;
}

export interface ExtractionOptions {
  batchSize?: number;
  concurrency?: number;
  maxRetries?: number;
  onProgress?: (progress: ExtractionProgress) => void;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Orchestrates the full extraction pipeline: splits parsed CSV rows into
 * batches, sends each batch to the configured LLM provider (with retries and
 * bounded concurrency), validates/sanitizes the output, and defensively
 * re-applies the "skip rows without email or mobile" rule regardless of what
 * the model decided.
 */
export async function extractCrmRecords(
  rows: RawCsvRow[],
  provider: LlmProvider,
  options: ExtractionOptions = {}
): Promise<ImportResult> {
  const batchSize = options.batchSize ?? env.batchSize;
  const concurrency = options.concurrency ?? env.batchConcurrency;
  const maxRetries = options.maxRetries ?? env.maxRetries;

  const batches = chunk(rows, batchSize);
  const totalBatches = batches.length;
  let batchesCompleted = 0;
  let rowsProcessed = 0;

  const recordsByIndex = new Map<number, CrmRecord>();
  const skippedByIndex = new Map<number, SkippedRecord>();

  const markBatchFailed = (batchRows: RawCsvRow[], startIndex: number, reason: string) => {
    batchRows.forEach((raw, i) => {
      const rowIndex = startIndex + i;
      skippedByIndex.set(rowIndex, { rowIndex, raw, reason });
    });
  };

  const tasks = batches.map((batchRows, batchIndex) => async () => {
    const startIndex = batchIndex * batchSize;
    try {
      const rawRecords = await withRetry(() => provider.extractBatch(batchRows, startIndex), {
        retries: maxRetries,
      });

      const byRowIndex = new Map(rawRecords.map((r) => [r.row_index, r]));

      batchRows.forEach((raw, i) => {
        const rowIndex = startIndex + i;
        const rawRecord = byRowIndex.get(rowIndex);

        if (!rawRecord) {
          skippedByIndex.set(rowIndex, {
            rowIndex,
            raw,
            reason: "AI response did not include this row.",
          });
          return;
        }

        const record = sanitizeRecord(rawRecord);
        const hasContactInfo = rowHasContactInfo(raw, record);

        if (rawRecord.skip || !hasContactInfo) {
          skippedByIndex.set(rowIndex, {
            rowIndex,
            raw,
            reason: "Row has neither an email address nor a mobile number.",
          });
          return;
        }

        recordsByIndex.set(rowIndex, record);
      });
    } catch (err) {
      markBatchFailed(batchRows, startIndex, `AI extraction failed for this batch: ${(err as Error).message}`);
    }
  });

  await runWithConcurrency(tasks, concurrency, () => {
    batchesCompleted++;
    rowsProcessed = Math.min(rows.length, batchesCompleted * batchSize);
    options.onProgress?.({ batchesCompleted, totalBatches, rowsProcessed, totalRows: rows.length });
  });

  const records: CrmRecord[] = [];
  const skippedRecords: SkippedRecord[] = [];
  for (let i = 0; i < rows.length; i++) {
    const record = recordsByIndex.get(i);
    if (record) {
      records.push(record);
    } else {
      skippedRecords.push(
        skippedByIndex.get(i) ?? { rowIndex: i, raw: rows[i], reason: "Row was not processed." }
      );
    }
  }

  return {
    totalRows: rows.length,
    imported: records.length,
    skipped: skippedRecords.length,
    records,
    skippedRecords,
  };
}
