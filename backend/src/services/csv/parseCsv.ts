import { parse } from "csv-parse/sync";
import type { RawCsvRow } from "../../types/crm.js";

export class CsvParseError extends Error {}

/** Parses a raw CSV buffer into header-keyed rows. Column names are never assumed —
 * whatever headers the source file uses are passed through verbatim so the LLM
 * extraction step can map them. */
export function parseCsvBuffer(buffer: Buffer): RawCsvRow[] {
  let records: RawCsvRow[];
  try {
    records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch (err) {
    throw new CsvParseError(
      `Could not parse CSV file: ${(err as Error).message}`
    );
  }

  if (records.length === 0) {
    throw new CsvParseError("The uploaded CSV file has no data rows.");
  }

  return records;
}
