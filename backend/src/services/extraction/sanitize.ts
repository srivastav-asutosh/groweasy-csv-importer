import {
  CRM_FIELD_ORDER,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  type CrmRecord,
  type RawCsvRow,
} from "../../types/crm.js";
import type { RawExtractedRecord } from "../llm/types.js";

function asStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function isValidDate(value: string | null): boolean {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

/** Defensive re-check: the assignment's skip rule is a hard requirement, so
 * we never trust the model's `skip` flag alone — we independently verify
 * that email and mobile are both genuinely absent from the raw row. */
export function rowHasContactInfo(raw: RawCsvRow, record: Pick<CrmRecord, "email" | "mobile_without_country_code">): boolean {
  if (record.email || record.mobile_without_country_code) return true;

  const joined = Object.values(raw).join(" ");
  const hasEmail = /[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/.test(joined);
  const hasPhone = /(\+?\d[\d\s-]{6,}\d)/.test(joined);
  return hasEmail || hasPhone;
}

/** Validates and coerces one raw model-extracted record into a well-formed CrmRecord.
 * Invalid enum values are dropped to null/blank rather than rejecting the whole record,
 * so a single bad field doesn't discard otherwise-good extraction. */
export function sanitizeRecord(raw: RawExtractedRecord): CrmRecord {
  const crm_status_candidate = asStringOrNull(raw.crm_status);
  const crm_status = (CRM_STATUS_VALUES as readonly string[]).includes(crm_status_candidate ?? "")
    ? (crm_status_candidate as CrmRecord["crm_status"])
    : null;

  const data_source_candidate = asStringOrNull(raw.data_source) ?? "";
  const data_source = (DATA_SOURCE_VALUES as readonly string[]).includes(data_source_candidate)
    ? (data_source_candidate as CrmRecord["data_source"])
    : "";

  const created_at_candidate = asStringOrNull(raw.created_at);
  const created_at = isValidDate(created_at_candidate) ? created_at_candidate : null;

  const record: CrmRecord = {
    created_at,
    name: asStringOrNull(raw.name),
    email: asStringOrNull(raw.email),
    country_code: asStringOrNull(raw.country_code),
    mobile_without_country_code: asStringOrNull(raw.mobile_without_country_code),
    company: asStringOrNull(raw.company),
    city: asStringOrNull(raw.city),
    state: asStringOrNull(raw.state),
    country: asStringOrNull(raw.country),
    lead_owner: asStringOrNull(raw.lead_owner),
    crm_status,
    crm_note: asStringOrNull(raw.crm_note),
    data_source,
    possession_time: asStringOrNull(raw.possession_time),
    description: asStringOrNull(raw.description),
  };

  // Guarantee field order/shape for consistent JSON + CSV-safety (strip stray newlines).
  for (const field of CRM_FIELD_ORDER) {
    const value = record[field];
    if (typeof value === "string" && value.includes("\n")) {
      (record[field] as string) = value.replace(/\r?\n/g, "\\n");
    }
  }

  return record;
}
