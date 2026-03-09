import { describe, expect, it } from "vitest";
import { deriveFilenameFromUrl, getPdfSourceFromViewerUrl, isLikelyPdfUrl } from "./pdfDetection.js";

describe("pdfDetection", () => {
  it("detects simple pdf urls", () => {
    expect(isLikelyPdfUrl("https://example.com/report.pdf")).toBe(true);
    expect(isLikelyPdfUrl("https://example.com/report")).toBe(false);
  });

  it("extracts the original source url from Chrome's PDF viewer", () => {
    const viewerUrl =
      "chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html?src=https%3A%2F%2Fexample.com%2Fhello.pdf";
    expect(getPdfSourceFromViewerUrl(viewerUrl)).toBe("https://example.com/hello.pdf");
  });

  it("derives a filename from the source url", () => {
    expect(deriveFilenameFromUrl("https://example.com/files/design-spec")).toBe("design-spec.pdf");
  });
});
