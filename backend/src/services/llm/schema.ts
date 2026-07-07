import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES } from "../../types/crm.js";

/**
 * Shared JSON schema describing one extracted record, keyed by the exact CRM
 * field names from the assignment. `row_index` and `skip` are extraction
 * metadata (not CRM fields) so the backend can align AI output back to the
 * original CSV rows and enforce the skip rule defensively.
 */
export const RECORD_SCHEMA_PROPERTIES = {
  row_index: {
    type: "integer",
    description: "0-based index of the input row this record corresponds to.",
  },
  skip: {
    type: "boolean",
    description:
      "true if the row has neither an email address nor a mobile number and must be skipped.",
  },
  created_at: { type: ["string", "null"], description: "Lead creation date/time, parseable by JavaScript `new Date()`." },
  name: { type: ["string", "null"], description: "Lead's full name." },
  email: { type: ["string", "null"], description: "Primary email address (first one, if several)." },
  country_code: { type: ["string", "null"], description: "Phone country code, e.g. +91." },
  mobile_without_country_code: { type: ["string", "null"], description: "Mobile number without the country code." },
  company: { type: ["string", "null"] },
  city: { type: ["string", "null"] },
  state: { type: ["string", "null"] },
  country: { type: ["string", "null"] },
  lead_owner: { type: ["string", "null"], description: "Person/agent who owns this lead." },
  crm_status: {
    type: ["string", "null"],
    enum: [...CRM_STATUS_VALUES, null],
  },
  crm_note: {
    type: ["string", "null"],
    description:
      "Remarks, follow-up notes, extra emails/phone numbers, or any useful info that doesn't fit another field.",
  },
  data_source: {
    type: ["string", "null"],
    enum: [...DATA_SOURCE_VALUES, "", null],
  },
  possession_time: { type: ["string", "null"], description: "Property possession time, if applicable." },
  description: { type: ["string", "null"] },
} as const;

export const RECORD_REQUIRED_FIELDS = Object.keys(RECORD_SCHEMA_PROPERTIES);

export const EXTRACTION_JSON_SCHEMA = {
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
} as const;
