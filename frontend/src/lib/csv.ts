import Papa from "papaparse";
import type { RawCsvRow } from "./types";

export interface ParsedCsv {
  headers: string[];
  rows: RawCsvRow[];
}

export class CsvParseError extends Error {}

/** Client-side CSV parse used purely for the preview step — no AI, no network call. */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new CsvParseError(results.errors[0].message));
          return;
        }
        const headers = results.meta.fields ?? [];
        if (headers.length === 0 || results.data.length === 0) {
          reject(new CsvParseError("The CSV file has no data rows."));
          return;
        }
        resolve({ headers, rows: results.data });
      },
      error: (err: Error) => reject(new CsvParseError(err.message)),
    });
  });
}
