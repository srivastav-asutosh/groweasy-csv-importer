import type { RawCsvRow } from "../../../types/crm.js";
import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES } from "../../../types/crm.js";
import type { LlmProvider, RawExtractedRecord } from "../types.js";

const EMAIL_RE = /[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/g;
const PHONE_RE = /(\+?\d[\d\s-]{6,}\d)/g;

function findColumn(row: RawCsvRow, keywords: string[]): string | undefined {
  const entry = Object.entries(row).find(([key]) =>
    keywords.some((kw) => key.toLowerCase().includes(kw))
  );
  return entry?.[1]?.trim() || undefined;
}

function extractAll(row: RawCsvRow, regex: RegExp): string[] {
  const joined = Object.values(row).join(" ");
  return [...joined.matchAll(regex)].map((m) => m[0].trim());
}

/**
 * Deterministic, keyword/regex-based stand-in for a real LLM. Used when
 * LLM_PROVIDER=mock (default for local development and the automated test
 * suite) so the whole pipeline is exercisable without any API key or network
 * call. It intentionally applies the same business rules (skip / enum /
 * multi-contact consolidation) as the real providers are prompted to.
 */
export class MockProvider implements LlmProvider {
  readonly name = "mock";

  async extractBatch(rows: RawCsvRow[], startIndex: number): Promise<RawExtractedRecord[]> {
    return rows.map((row, i) => {
      const emails = extractAll(row, EMAIL_RE);
      const phones = extractAll(row, PHONE_RE).map((p) => p.replace(/[\s-]/g, ""));

      const skip = emails.length === 0 && phones.length === 0;

      const extraNotes: string[] = [];
      if (emails.length > 1) extraNotes.push(`Additional email: ${emails.slice(1).join(", ")}`);
      if (phones.length > 1) extraNotes.push(`Additional phone: ${phones.slice(1).join(", ")}`);

      const remark = findColumn(row, ["note", "remark", "comment", "status", "stage"]);
      const note = [remark, ...extraNotes].filter(Boolean).join(" | ") || null;

      const rawStatus = findColumn(row, ["status", "stage"]);
      const crm_status =
        (CRM_STATUS_VALUES as readonly string[]).find(
          (s) => rawStatus && s.toLowerCase() === rawStatus.toLowerCase().replace(/\s+/g, "_")
        ) ?? null;

      const rawSource = findColumn(row, ["source"]);
      const data_source =
        (DATA_SOURCE_VALUES as readonly string[]).find(
          (s) => rawSource && s.toLowerCase() === rawSource.toLowerCase().replace(/\s+/g, "_")
        ) ?? "";

      const firstPhone = phones[0];
      const countryCode = firstPhone?.startsWith("+") ? firstPhone.slice(0, firstPhone.length - 10) : null;
      const mobile = firstPhone ? firstPhone.replace(/^\+\d{1,3}/, "").slice(-10) : null;

      const record: RawExtractedRecord = {
        row_index: startIndex + i,
        skip,
        created_at: findColumn(row, ["created", "date", "timestamp"]) ?? null,
        name: findColumn(row, ["name"]) ?? null,
        email: emails[0] ?? null,
        country_code: countryCode || (mobile ? "+91" : null),
        mobile_without_country_code: mobile,
        company: findColumn(row, ["company", "organisation", "organization"]) ?? null,
        city: findColumn(row, ["city"]) ?? null,
        state: findColumn(row, ["state"]) ?? null,
        country: findColumn(row, ["country"]) ?? null,
        lead_owner: findColumn(row, ["owner", "agent", "assigned"]) ?? null,
        crm_status,
        crm_note: note,
        data_source,
        possession_time: findColumn(row, ["possession"]) ?? null,
        description: findColumn(row, ["description", "desc"]) ?? null,
      };

      return record;
    });
  }
}
