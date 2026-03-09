import { describe, expect, it } from "vitest";
import { sanitizePdfFilename } from "./filename.js";

describe("sanitizePdfFilename", () => {
  it("adds a pdf extension when missing", () => {
    expect(sanitizePdfFilename("Quarterly report")).toBe("Quarterly report.pdf");
  });

  it("replaces unsafe characters", () => {
    expect(sanitizePdfFilename("report:Q1?.pdf")).toBe("report_Q1_.pdf");
  });
});
