import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { ImportStreamEvent } from "../src/types/crm.js";

let app: Express;

beforeAll(async () => {
  process.env.LLM_PROVIDER = "mock";
  const { createApp } = await import("../src/app.js");
  app = createApp();
});

function parseNdjson(text: string): ImportStreamEvent[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe("GET /api/health", () => {
  it("reports ok status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("POST /api/import", () => {
  it("rejects requests with no file", async () => {
    const res = await request(app).post("/api/import");
    expect(res.status).toBe(400);
  });

  it("rejects non-csv files", async () => {
    const res = await request(app)
      .post("/api/import")
      .attach("file", Buffer.from("not a csv"), { filename: "notes.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
  });

  it("streams NDJSON progress events and a final result for a valid CSV", async () => {
    const csv = [
      "Name,Email Address,Phone Number,Status",
      "John Doe,john@example.com,9876543210,Interested - please follow up",
      "No Contact Person,,,",
    ].join("\n");

    const res = await request(app)
      .post("/api/import")
      .attach("file", Buffer.from(csv), { filename: "leads.csv", contentType: "text/csv" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/x-ndjson");

    const events = parseNdjson(res.text);
    expect(events[0].type).toBe("start");
    expect(events.at(-1)?.type).toBe("result");

    const resultEvent = events.find((e) => e.type === "result");
    if (resultEvent?.type !== "result") throw new Error("expected a result event");

    expect(resultEvent.result.totalRows).toBe(2);
    expect(resultEvent.result.imported).toBe(1);
    expect(resultEvent.result.skipped).toBe(1);
    expect(resultEvent.result.records[0].email).toBe("john@example.com");
  });

  it("rejects a CSV with no data rows", async () => {
    const res = await request(app)
      .post("/api/import")
      .attach("file", Buffer.from("Name,Email\n"), { filename: "empty.csv", contentType: "text/csv" });
    expect(res.status).toBe(400);
  });
});
