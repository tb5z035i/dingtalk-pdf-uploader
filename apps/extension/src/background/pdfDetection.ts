const CHROME_PDF_VIEWER_PREFIX = "chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/";

export function isChromePdfViewerUrl(url: string): boolean {
  return url.startsWith(CHROME_PDF_VIEWER_PREFIX);
}

export function isLikelyPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().includes(".pdf");
  }
}

export function getPdfSourceFromViewerUrl(url: string): string | undefined {
  if (!isChromePdfViewerUrl(url)) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    const source = parsed.searchParams.get("src");
    return source ? decodeURIComponent(source) : undefined;
  } catch {
    return undefined;
  }
}

export function deriveFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathnameParts = parsed.pathname.split("/").filter(Boolean);
    const lastPart = pathnameParts.at(-1);
    if (lastPart) {
      return lastPart.toLowerCase().endsWith(".pdf") ? lastPart : `${lastPart}.pdf`;
    }
  } catch {
    // ignore
  }

  return "document.pdf";
}
