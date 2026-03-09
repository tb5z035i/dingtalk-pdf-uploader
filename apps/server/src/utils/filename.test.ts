import { describe, expect, it } from "vitest";
import { isPdfFilename, sanitizePdfFilename } from "./filename.js";

describe("sanitizePdfFilename", () => {
  it("adds a pdf extension when missing", () => {
    expect(sanitizePdfFilename("Quarterly Report")).toBe("Quarterly Report.pdf");
  });

  it("removes unsafe characters", () => {
    expect(sanitizePdfFilename('report:Q1?.pdf')).toBe("report_Q1_.pdf");
  });
});

describe("isPdfFilename", () => {
  it("accepts pdf names case-insensitively", () => {
    expect(isPdfFilename("hello.PDF")).toBe(true);
  });
});
