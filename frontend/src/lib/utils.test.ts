import { describe, expect, it } from "vitest";
import { cn, formatBytes } from "./utils";

describe("cn", () => {
  it("joins truthy class names with a space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("formatBytes", () => {
  it("formats bytes under 1KB as-is", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
