import { describe, expect, it } from "vitest";
import { rowHasContactInfo, sanitizeRecord } from "../src/services/extraction/sanitize.js";
import type { RawExtractedRecord } from "../src/services/llm/types.js";

function baseRaw(overrides: Partial<RawExtractedRecord> = {}): RawExtractedRecord {
  return {
    row_index: 0,
    skip: false,
    created_at: "2026-05-13 14:20:48",
    name: "John Doe",
    email: "john@example.com",
    country_code: "+91",
    mobile_without_country_code: "9876543210",
    company: "GrowEasy",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    lead_owner: "test@gmail.com",
    crm_status: "GOOD_LEAD_FOLLOW_UP",
    crm_note: "Client is asking to reschedule demo",
    data_source: "leads_on_demand",
    possession_time: null,
    description: null,
    ...overrides,
  };
}

describe("sanitizeRecord", () => {
  it("passes through a well-formed record unchanged", () => {
    const record = sanitizeRecord(baseRaw());
    expect(record.name).toBe("John Doe");
    expect(record.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(record.data_source).toBe("leads_on_demand");
  });

  it("nulls out an invalid crm_status instead of throwing", () => {
    const record = sanitizeRecord(baseRaw({ crm_status: "INTERESTED" }));
    expect(record.crm_status).toBeNull();
  });

  it("blanks out an invalid data_source instead of throwing", () => {
    const record = sanitizeRecord(baseRaw({ data_source: "some_random_project" }));
    expect(record.data_source).toBe("");
  });

  it("keeps a valid data_source value", () => {
    const record = sanitizeRecord(baseRaw({ data_source: "eden_park" }));
    expect(record.data_source).toBe("eden_park");
  });

  it("nulls out a created_at that new Date() cannot parse", () => {
    const record = sanitizeRecord(baseRaw({ created_at: "not-a-date" }));
    expect(record.created_at).toBeNull();
  });

  it("keeps a valid created_at", () => {
    const record = sanitizeRecord(baseRaw({ created_at: "2026-05-13" }));
    expect(record.created_at).toBe("2026-05-13");
  });

  it("escapes embedded newlines so the record stays CSV-safe", () => {
    const record = sanitizeRecord(baseRaw({ crm_note: "Line one\nLine two" }));
    expect(record.crm_note).toBe("Line one\\nLine two");
  });

  it("converts blank/whitespace strings to null", () => {
    const record = sanitizeRecord(baseRaw({ company: "   " }));
    expect(record.company).toBeNull();
  });
});

describe("rowHasContactInfo", () => {
  it("returns true when the sanitized record already has an email", () => {
    expect(
      rowHasContactInfo({}, { email: "a@b.com", mobile_without_country_code: null })
    ).toBe(true);
  });

  it("returns true when the sanitized record already has a mobile", () => {
    expect(
      rowHasContactInfo({}, { email: null, mobile_without_country_code: "9876543210" })
    ).toBe(true);
  });

  it("falls back to scanning the raw row for an email the model may have missed", () => {
    expect(
      rowHasContactInfo(
        { Contact: "reach me at a@b.com" },
        { email: null, mobile_without_country_code: null }
      )
    ).toBe(true);
  });

  it("returns false when neither the record nor the raw row has contact info", () => {
    expect(
      rowHasContactInfo({ Name: "John Doe", City: "Mumbai" }, { email: null, mobile_without_country_code: null })
    ).toBe(false);
  });
});
