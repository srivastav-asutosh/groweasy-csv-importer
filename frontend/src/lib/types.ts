// Mirrors backend/src/types/crm.ts. Kept in sync manually since the frontend
// and backend are independently deployable services communicating over HTTP.

export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;
export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;
export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

export interface CrmRecord {
  created_at: string | null;
  name: string | null;
  email: string | null;
  country_code: string | null;
  mobile_without_country_code: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: CrmStatus | null;
  crm_note: string | null;
  data_source: DataSource | "" | null;
  possession_time: string | null;
  description: string | null;
}

export const CRM_FIELD_ORDER: (keyof CrmRecord)[] = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
];

export type RawCsvRow = Record<string, string>;

export interface SkippedRecord {
  rowIndex: number;
  raw: RawCsvRow;
  reason: string;
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  records: CrmRecord[];
  skippedRecords: SkippedRecord[];
}

export type ImportStreamEvent =
  | { type: "start"; totalRows: number; totalBatches: number }
  | {
      type: "progress";
      batchesCompleted: number;
      totalBatches: number;
      rowsProcessed: number;
      totalRows: number;
    }
  | { type: "result"; result: ImportResult }
  | { type: "error"; message: string };
