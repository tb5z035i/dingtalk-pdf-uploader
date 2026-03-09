import type { ActivePdfContext } from "../lib/types.js";
import { deriveFilenameFromUrl, getPdfSourceFromViewerUrl, isLikelyPdfUrl } from "./pdfDetection.js";

export function resolvePdfContext(
  tabUrl: string | undefined,
  observedPdfUrl: string | undefined
): ActivePdfContext {
  if (!tabUrl) {
    return {
      ok: true,
      isPdf: false,
      message: "No active tab URL was available."
    };
  }

  const viewerSourceUrl = getPdfSourceFromViewerUrl(tabUrl);
  if (viewerSourceUrl) {
    return {
      ok: true,
      isPdf: true,
      sourceUrl: viewerSourceUrl,
      filename: deriveFilenameFromUrl(viewerSourceUrl),
      isLocalFile: viewerSourceUrl.startsWith("file://"),
      detectionMethod: "chrome_pdf_viewer_src"
    };
  }

  if (isLikelyPdfUrl(tabUrl)) {
    return {
      ok: true,
      isPdf: true,
      sourceUrl: tabUrl,
      filename: deriveFilenameFromUrl(tabUrl),
      isLocalFile: tabUrl.startsWith("file://"),
      detectionMethod: "url_suffix"
    };
  }

  if (observedPdfUrl) {
    return {
      ok: true,
      isPdf: true,
      sourceUrl: observedPdfUrl,
      filename: deriveFilenameFromUrl(observedPdfUrl),
      isLocalFile: observedPdfUrl.startsWith("file://"),
      detectionMethod: "response_header"
    };
  }

  return {
    ok: true,
    isPdf: false,
    message: "The active tab does not appear to be a PDF."
  };
}
