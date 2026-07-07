import { describe, expect, it } from "vitest";
import { parseCsvFile, CsvParseError } from "./csv";

function csvFile(content: string, name = "test.csv") {
  return new File([content], name, { type: "text/csv" });
}

describe("parseCsvFile", () => {
  it("parses headers and rows, trimming header whitespace", async () => {
    const csv = "Name, Email \nJohn Doe,john@example.com\nJane Doe,jane@example.com\n";
    const result = await parseCsvFile(csvFile(csv));

    expect(result.headers).toEqual(["Name", "Email"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ Name: "John Doe", Email: "john@example.com" });
  });

  it("skips empty lines", async () => {
    const csv = "Name,Email\nJohn Doe,john@example.com\n\n\nJane Doe,jane@example.com\n";
    const result = await parseCsvFile(csvFile(csv));
    expect(result.rows).toHaveLength(2);
  });

  it("rejects a file with headers but no data rows", async () => {
    await expect(parseCsvFile(csvFile("Name,Email\n"))).rejects.toBeInstanceOf(CsvParseError);
  });

  it("rejects a completely empty file", async () => {
    await expect(parseCsvFile(csvFile(""))).rejects.toBeInstanceOf(CsvParseError);
  });
});
