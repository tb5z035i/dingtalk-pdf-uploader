import { describe, expect, it } from "vitest";
import { resolvePdfContext } from "./pdfSourceResolver.js";

describe("resolvePdfContext", () => {
  it("uses the Chrome PDF viewer src parameter when available", () => {
    const context = resolvePdfContext(
      "chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html?src=https%3A%2F%2Fexample.com%2Fguide.pdf",
      undefined
    );

    expect(context.isPdf).toBe(true);
    expect(context.sourceUrl).toBe("https://example.com/guide.pdf");
    expect(context.detectionMethod).toBe("chrome_pdf_viewer_src");
  });

  it("falls back to observed header-based pdf urls", () => {
    const context = resolvePdfContext("https://example.com/content?id=123", "https://example.com/download?id=123");
    expect(context.isPdf).toBe(true);
    expect(context.detectionMethod).toBe("response_header");
  });

  it("returns a negative result when nothing indicates a pdf", () => {
    const context = resolvePdfContext("https://example.com/home", undefined);
    expect(context.isPdf).toBe(false);
  });
});
