import { describe, expect, it, vi } from "vitest";
import { extractCrmRecords } from "../src/services/extraction/extraction.service.js";
import type { LlmProvider, RawExtractedRecord } from "../src/services/llm/types.js";
import type { RawCsvRow } from "../src/types/crm.js";

function makeRow(overrides: RawCsvRow = {}): RawCsvRow {
  return { Name: "Jane Doe", Email: "jane@example.com", Phone: "9876543210", ...overrides };
}

function fakeProviderFor(rows: RawCsvRow[]): LlmProvider {
  return {
    name: "fake",
    async extractBatch(batchRows, startIndex) {
      return batchRows.map((row, i): RawExtractedRecord => ({
        row_index: startIndex + i,
        skip: !row.Email && !row.Phone,
        name: row.Name ?? null,
        email: row.Email ?? null,
        mobile_without_country_code: row.Phone ?? null,
        country_code: row.Phone ? "+91" : null,
        created_at: null,
        company: null,
        city: null,
        state: null,
        country: null,
        lead_owner: null,
        crm_status: null,
        crm_note: null,
        data_source: "",
        possession_time: null,
        description: null,
      }));
    },
  };
}

describe("extractCrmRecords", () => {
  it("imports rows that have contact info and skips rows that don't", async () => {
    const rows = [makeRow(), makeRow({ Name: "No Contact", Email: "", Phone: "" })];
    const result = await extractCrmRecords(rows, fakeProviderFor(rows), { batchSize: 10, concurrency: 2 });

    expect(result.totalRows).toBe(2);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.records[0].name).toBe("Jane Doe");
    expect(result.skippedRecords[0].reason).toMatch(/neither an email/i);
  });

  it("splits rows across multiple batches and reports progress for each", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => makeRow({ Name: `Lead ${i}` }));
    const onProgress = vi.fn();

    const result = await extractCrmRecords(rows, fakeProviderFor(rows), {
      batchSize: 2,
      concurrency: 2,
      onProgress,
    });

    expect(result.imported).toBe(5);
    expect(onProgress).toHaveBeenCalledTimes(3); // ceil(5/2) batches
    const lastCall = onProgress.mock.calls.at(-1)?.[0];
    expect(lastCall.batchesCompleted).toBe(3);
    expect(lastCall.totalBatches).toBe(3);
  });

  it("marks an entire batch as skipped (with a reason) when the provider throws, instead of failing the whole import", async () => {
    const rows = [makeRow(), makeRow({ Name: "Second" })];
    const failingProvider: LlmProvider = {
      name: "failing",
      extractBatch: vi.fn().mockRejectedValue(new Error("rate limited")),
    };

    const result = await extractCrmRecords(rows, failingProvider, {
      batchSize: 10,
      concurrency: 1,
      maxRetries: 1,
    });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(2);
    expect(result.skippedRecords[0].reason).toMatch(/AI extraction failed/i);
    // initial attempt + 1 retry
    expect(failingProvider.extractBatch).toHaveBeenCalledTimes(2);
  });

  it("independently re-verifies the skip rule even if the model claims skip: false", async () => {
    const rows = [makeRow({ Name: "Ghost", Email: "", Phone: "" })];
    const dishonestProvider: LlmProvider = {
      name: "dishonest",
      async extractBatch(batchRows, startIndex) {
        return batchRows.map((_, i) => ({
          row_index: startIndex + i,
          skip: false, // lies — row actually has no contact info
          name: "Ghost",
          email: null,
          mobile_without_country_code: null,
          country_code: null,
          created_at: null,
          company: null,
          city: null,
          state: null,
          country: null,
          lead_owner: null,
          crm_status: null,
          crm_note: null,
          data_source: "",
          possession_time: null,
          description: null,
        }));
      },
    };

    const result = await extractCrmRecords(rows, dishonestProvider, { batchSize: 10, concurrency: 1 });
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
