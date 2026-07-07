import type { RawExtractedRecord } from "./types.js";

/** Strips markdown code fences some models add despite instructions not to. */
function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : text.trim();
}

/** Parses a model's raw text response into the { records: [...] } shape, tolerating
 * markdown fences or leading/trailing prose around the JSON object. */
export function parseRecordsResponse(text: string): RawExtractedRecord[] {
  const cleaned = stripCodeFences(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Model response did not contain valid JSON.");
    }
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }

  const records = (parsed as { records?: unknown }).records;
  if (!Array.isArray(records)) {
    throw new Error('Model response JSON did not contain a "records" array.');
  }
  return records as RawExtractedRecord[];
}
